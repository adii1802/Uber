const mongoose = require('mongoose');
const DispatchJob = require('../models/dispatchJob.model');
const DispatchOffer = require('../models/dispatchOffer.model');
const DispatchAssignment = require('../models/dispatchAssignment.model');
const Shipment = require('../models/shipment.model');
const CargoBooking = require('../models/cargoBooking.model');
const vehicleModel = require('../models/vehicle.model');
const vehicleEligibilityService = require('./vehicleEligibility.service');
const dispatchRankingService = require('./dispatchRanking.service');
const logger = require('../utils/logger');

class DispatchService {
  /**
   * 1. Initiate a dispatch job for a confirmed booking's shipment
   */
  static async createDispatchJob(shipmentId, initiatedBy = null, initiatedRole = 'Admin') {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      const err = new Error('Shipment consignment not found');
      err.status = 404;
      throw err;
    }

    const booking = await CargoBooking.findById(shipment.booking);
    if (!booking) {
      const err = new Error('Associated cargo booking not found');
      err.status = 404;
      throw err;
    }

    if (booking.bookingStatus !== 'CONFIRMED') {
      const err = new Error(
        `Cannot initiate dispatch: Cargo booking must be in 'CONFIRMED' status (current: '${booking.bookingStatus}')`
      );
      err.status = 400;
      throw err;
    }

    // Check for existing dispatch job for this shipment
    let dispatchJob = await DispatchJob.findOne({ shipment: shipment._id });
    if (dispatchJob) {
      if (dispatchJob.status === 'ASSIGNED') {
        const err = new Error('Conflict: This shipment is already assigned to a transporter');
        err.status = 409;
        throw err;
      }
      if (dispatchJob.status === 'OFFERING' || dispatchJob.status === 'PENDING') {
        // Return active job idempotently
        return dispatchJob;
      }
      if (dispatchJob.status === 'EXHAUSTED') {
        // Reset exhausted job
        return await this.retryDispatch(dispatchJob._id, initiatedBy, initiatedRole);
      }
      if (dispatchJob.status === 'CANCELLED') {
        const err = new Error('Cannot initiate dispatch: Previous dispatch job was cancelled');
        err.status = 400;
        throw err;
      }
    }

    // Create new DispatchJob with immutable point-in-time snapshots
    dispatchJob = new DispatchJob({
      booking: booking._id,
      shipment: shipment._id,
      requiredVehicleCategory: booking.requestedVehicleCategory,
      requiredPayloadKg: booking.cargo.weightKg,
      requiredDimensions: booking.cargo.dimensions || {},
      cargoSnapshot: {
        name: booking.cargo.name,
        category: booking.cargo.category,
        weightKg: booking.cargo.weightKg,
        packageCount: booking.cargo.packageCount,
        packagingType: booking.cargo.packagingType,
        isFragile: Boolean(booking.cargo.isFragile),
        handlingInstructions: booking.cargo.handlingInstructions || '',
      },
      pickupLocationSnapshot: booking.pickup,
      deliveryLocationSnapshot: booking.dropoff,
      status: 'PENDING',
      attemptCount: 1,
      initiatedBy: initiatedBy || null,
      initiatedModel: initiatedRole === 'Admin' ? 'Admin' : 'System',
      auditLog: [
        {
          action: 'DISPATCH_INITIATED',
          performedBy: initiatedBy || null,
          performedModel: initiatedRole === 'Admin' ? 'Admin' : 'System',
          timestamp: new Date(),
          metadata: { shipmentId, bookingId: booking._id },
        },
      ],
    });

    await dispatchJob.save();

    // Generate initial offers
    await this.generateOffers(dispatchJob._id);

    return await DispatchJob.findById(dispatchJob._id);
  }

  /**
   * 2. Find eligible commercial vehicles for a dispatch job
   */
  static async findEligibleVehicles(dispatchJobId) {
    const job = await DispatchJob.findById(dispatchJobId);
    if (!job) {
      const err = new Error('Dispatch job not found');
      err.status = 404;
      throw err;
    }

    // Find all vehicles or transporters that already received offers for this job
    const existingOffers = await DispatchOffer.find({ dispatchJob: job._id }).select('vehicle transporter');
    const excludeVehicleIds = existingOffers.map((o) => o.vehicle);
    const excludeTransporterIds = existingOffers.map((o) => o.transporter);

    const requirements = {
      requiredVehicleCategory: job.requiredVehicleCategory,
      requiredPayloadKg: job.requiredPayloadKg,
      dimensions: job.requiredDimensions,
      isFragile: job.cargoSnapshot?.isFragile,
    };

    const eligibilityResult = await vehicleEligibilityService.findEligibleVehicles(requirements, {
      excludeVehicleIds,
      excludeTransporterIds,
    });

    // Rank candidate vehicles
    const rankedVehicles = dispatchRankingService.rankEligibleVehicles(
      eligibilityResult.eligibleVehicles,
      job.pickupLocationSnapshot,
      requirements
    );

    return {
      job,
      rankedVehicles,
      evaluatedCount: eligibilityResult.evaluatedCount,
      eligibleCount: eligibilityResult.eligibleCount,
      rejections: eligibilityResult.rejections,
    };
  }

  /**
   * 3. Generate job offers for eligible transporters
   */
  static async generateOffers(dispatchJobId, options = {}) {
    const job = await DispatchJob.findById(dispatchJobId);
    if (!job) {
      const err = new Error('Dispatch job not found');
      err.status = 404;
      throw err;
    }

    if (job.status !== 'PENDING' && job.status !== 'OFFERING') {
      const err = new Error(`Cannot generate offers: Dispatch job is in '${job.status}' status`);
      err.status = 400;
      throw err;
    }

    // First, expire any outdated offers
    await this.expireOffers(job._id);

    const { rankedVehicles } = await this.findEligibleVehicles(job._id);

    const batchSize = options.batchSize || job.batchSize || 5;
    const expirySeconds = options.expirySeconds || job.offerExpirySeconds || 120;
    const candidateBatch = rankedVehicles.slice(0, batchSize);

    if (candidateBatch.length === 0) {
      // Check if there are any active PENDING offers out there
      const pendingOffersCount = await DispatchOffer.countDocuments({
        dispatchJob: job._id,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      });

      if (pendingOffersCount === 0) {
        job.status = 'EXHAUSTED';
        job.exhaustionReason = 'No verified, available commercial vehicles matched freight requirements';
        job.auditLog.push({
          action: 'DISPATCH_EXHAUSTED',
          timestamp: new Date(),
          metadata: { reason: job.exhaustionReason },
        });
        await job.save();
      }

      return [];
    }

    const createdOffers = [];
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    for (const vehicle of candidateBatch) {
      const transporterId = vehicle.transporter?._id || vehicle.transporter;

      // Create DispatchOffer
      const offer = new DispatchOffer({
        dispatchJob: job._id,
        shipment: job.shipment,
        booking: job.booking,
        transporter: transporterId,
        vehicle: vehicle._id,
        status: 'PENDING',
        offeredAt: new Date(),
        expiresAt,
        cargoSnapshot: {
          ...job.cargoSnapshot,
          dimensions: job.requiredDimensions,
        },
        pickupSnapshot: job.pickupLocationSnapshot,
        dropoffSnapshot: job.deliveryLocationSnapshot,
      });

      await offer.save();
      createdOffers.push(offer);
    }

    // Update DispatchJob status to OFFERING
    job.status = 'OFFERING';
    job.auditLog.push({
      action: 'OFFERS_GENERATED',
      timestamp: new Date(),
      metadata: {
        offerCount: createdOffers.length,
        expiresAt,
        transporterIds: createdOffers.map((o) => o.transporter),
      },
    });
    await job.save();

    return createdOffers;
  }

  /**
   * 4. Expire unanswered offers across the system (safe and repeatable)
   */
  static async expireOffers(dispatchJobId = null) {
    const now = new Date();
    const query = {
      status: 'PENDING',
      expiresAt: { $lt: now },
    };

    if (dispatchJobId) {
      query.dispatchJob = dispatchJobId;
    }

    // Find and update expired offers
    const expiredOffers = await DispatchOffer.find(query);
    if (expiredOffers.length === 0) return 0;

    await DispatchOffer.updateMany(
      { _id: { $in: expiredOffers.map((o) => o._id) } },
      { $set: { status: 'EXPIRED' } }
    );

    // Check affected jobs: if any job has 0 PENDING offers and no ACCEPTED offer, check exhaustion
    const jobIds = [...new Set(expiredOffers.map((o) => o.dispatchJob.toString()))];

    for (const jId of jobIds) {
      const remainingPending = await DispatchOffer.countDocuments({
        dispatchJob: jId,
        status: 'PENDING',
        expiresAt: { $gt: now },
      });

      if (remainingPending === 0) {
        const job = await DispatchJob.findById(jId);
        if (job && job.status === 'OFFERING') {
          // Attempt next batch or mark EXHAUSTED
          const nextOffers = await this.generateOffers(job._id);
          if (nextOffers.length === 0) {
            job.status = 'EXHAUSTED';
            job.exhaustionReason = 'All commercial dispatch offers expired without transporter acceptance';
            job.auditLog.push({
              action: 'DISPATCH_EXHAUSTED',
              timestamp: new Date(),
              metadata: { reason: job.exhaustionReason },
            });
            await job.save();
          }
        }
      }
    }

    return expiredOffers.length;
  }

  /**
   * 5. Transporter accepts an offer (ATOMIC CAS & CONCURRENCY DEFENSE)
   */
  static async acceptOffer(offerId, transporterId, metadata = {}) {
    // 1. Expire outdated offers first
    await this.expireOffers();

    // 2. Locate offer and verify ownership
    const offer = await DispatchOffer.findById(offerId);
    if (!offer) {
      const err = new Error('Dispatch offer not found');
      err.status = 404;
      throw err;
    }

    if (offer.transporter.toString() !== transporterId.toString()) {
      const err = new Error('Forbidden: You are not authorized to respond to this offer');
      err.status = 403;
      throw err;
    }

    if (offer.status === 'EXPIRED' || offer.expiresAt < new Date()) {
      const err = new Error('Cannot accept offer: This offer has expired');
      err.status = 400;
      throw err;
    }

    if (offer.status === 'REJECTED') {
      const err = new Error('Cannot accept offer: This offer was previously rejected');
      err.status = 400;
      throw err;
    }

    if (offer.status === 'WITHDRAWN') {
      const err = new Error(
        'Cannot accept offer: This offer was withdrawn as the shipment was assigned to another transporter'
      );
      err.status = 409;
      throw err;
    }

    if (offer.status !== 'PENDING') {
      const err = new Error(`Cannot accept offer in '${offer.status}' status`);
      err.status = 400;
      throw err;
    }

    // 3. ATOMIC OFFER CAS: Transition offer to ACCEPTED
    const acceptedOffer = await DispatchOffer.findOneAndUpdate(
      {
        _id: offer._id,
        transporter: transporterId,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          acceptanceMetadata: {
            acceptedAt: new Date(),
            ipAddress: metadata.ipAddress || '',
            userAgent: metadata.userAgent || '',
          },
        },
      },
      { new: true }
    );

    if (!acceptedOffer) {
      const err = new Error('Conflict: Offer is no longer available or was concurrently updated');
      err.status = 409;
      throw err;
    }

    // 4. ATOMIC DISPATCH JOB CAS: Transition job to ASSIGNED
    // Guarantees only ONE transporter can ever win the job
    const assignedJob = await DispatchJob.findOneAndUpdate(
      {
        _id: offer.dispatchJob,
        status: { $in: ['PENDING', 'OFFERING'] },
      },
      {
        $set: {
          status: 'ASSIGNED',
          assignedTransporter: transporterId,
          assignedVehicle: offer.vehicle,
          assignedAt: new Date(),
        },
        $push: {
          auditLog: {
            action: 'OFFER_ACCEPTED',
            performedBy: transporterId,
            performedModel: 'Captain',
            timestamp: new Date(),
            metadata: { offerId: offer._id, vehicleId: offer.vehicle },
          },
        },
      },
      { new: true }
    );

    // Concurrency Loss Detection: Another transporter accepted first!
    if (!assignedJob) {
      // Revert this offer to WITHDRAWN
      await DispatchOffer.findByIdAndUpdate(offer._id, {
        $set: { status: 'WITHDRAWN', respondedAt: new Date() },
      });

      const err = new Error(
        'Conflict: This shipment dispatch job has already been assigned to another transporter'
      );
      err.status = 409;
      throw err;
    }

    // 5. ATOMIC ASSIGNMENT RECORD CREATION (with unique constraint on shipment)
    let assignment;
    try {
      assignment = new DispatchAssignment({
        dispatchJob: assignedJob._id,
        booking: assignedJob.booking,
        shipment: assignedJob.shipment,
        transporter: transporterId,
        vehicle: offer.vehicle,
        offer: offer._id,
        assignmentStatus: 'ACTIVE',
        assignmentSource: 'TRANSPORTER_ACCEPTED_OFFER',
        auditMetadata: {
          acceptedOfferId: offer._id,
          assignmentTimestamp: new Date(),
          clientIp: metadata.ipAddress || '',
          userAgent: metadata.userAgent || '',
        },
      });

      await assignment.save();
    } catch (dbErr) {
      // Duplicate assignment detected via MongoDB unique index
      if (dbErr.code === 11000) {
        // Rollback job & offer
        await DispatchJob.findByIdAndUpdate(assignedJob._id, {
          $set: { status: 'OFFERING', assignedTransporter: null, assignedVehicle: null, assignedAt: null },
        });
        await DispatchOffer.findByIdAndUpdate(offer._id, {
          $set: { status: 'WITHDRAWN' },
        });

        const err = new Error('Conflict: An active assignment already exists for this shipment');
        err.status = 409;
        throw err;
      }
      throw dbErr;
    }

    // 6. UPDATE SHIPMENT & VEHICLE STATE
    try {
      // Update shipment with assigned carrier info
      await Shipment.findByIdAndUpdate(assignedJob.shipment, {
        $set: {
          assignedTransporter: transporterId,
          assignedVehicle: offer.vehicle,
          assignedAt: new Date(),
        },
        $push: {
          timeline: {
            status: 'ASSIGNED',
            timestamp: new Date(),
            notes: `Assigned to transporter via dispatch offer ${offer.offerReference}`,
          },
        },
      });

      // Update vehicle availability to ON_TRIP
      await vehicleModel.findByIdAndUpdate(offer.vehicle, {
        $set: { availabilityStatus: 'ON_TRIP' },
      });

      // 7. WITHDRAW ALL REMAINING PENDING OFFERS FOR THIS JOB
      await DispatchOffer.updateMany(
        {
          dispatchJob: assignedJob._id,
          _id: { $ne: offer._id },
          status: 'PENDING',
        },
        {
          $set: { status: 'WITHDRAWN' },
        }
      );
    } catch (postAssignErr) {
      logger.error('Post-assignment reconciliation error: %s', postAssignErr.stack || postAssignErr.message);
      // Even if secondary update encountered error, assignment was recorded safely
    }

    return {
      assignment,
      offer: acceptedOffer,
      dispatchJob: assignedJob,
    };
  }

  /**
   * 6. Transporter rejects an offer
   */
  static async rejectOffer(offerId, transporterId, rejectionReason = '') {
    await this.expireOffers();

    const offer = await DispatchOffer.findById(offerId);
    if (!offer) {
      const err = new Error('Dispatch offer not found');
      err.status = 404;
      throw err;
    }

    if (offer.transporter.toString() !== transporterId.toString()) {
      const err = new Error('Forbidden: You are not authorized to respond to this offer');
      err.status = 403;
      throw err;
    }

    if (offer.status !== 'PENDING') {
      const err = new Error(`Cannot reject offer: Offer is in '${offer.status}' status`);
      err.status = 400;
      throw err;
    }

    const rejectedOffer = await DispatchOffer.findOneAndUpdate(
      {
        _id: offer._id,
        transporter: transporterId,
        status: 'PENDING',
      },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          respondedAt: new Date(),
        },
      },
      { new: true }
    );

    // Check if more offers should be generated for the job
    const job = await DispatchJob.findById(offer.dispatchJob);
    if (job && job.status === 'OFFERING') {
      const activePending = await DispatchOffer.countDocuments({
        dispatchJob: job._id,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      });

      if (activePending === 0) {
        await this.generateOffers(job._id);
      }
    }

    return rejectedOffer;
  }

  /**
   * 7. Retry an exhausted dispatch job
   */
  static async retryDispatch(dispatchJobId, initiatedBy = null, initiatedRole = 'Admin') {
    const job = await DispatchJob.findById(dispatchJobId);
    if (!job) {
      const err = new Error('Dispatch job not found');
      err.status = 404;
      throw err;
    }

    if (job.status === 'ASSIGNED') {
      const err = new Error('Cannot retry: Dispatch job is already assigned');
      err.status = 400;
      throw err;
    }

    if (job.status === 'CANCELLED') {
      const err = new Error('Cannot retry: Dispatch job was cancelled');
      err.status = 400;
      throw err;
    }

    job.attemptCount += 1;
    job.status = 'PENDING';
    job.exhaustionReason = '';
    job.auditLog.push({
      action: 'DISPATCH_RETRIED',
      performedBy: initiatedBy || null,
      performedModel: initiatedRole === 'Admin' ? 'Admin' : 'System',
      timestamp: new Date(),
      metadata: { attemptCount: job.attemptCount },
    });

    await job.save();

    await this.generateOffers(job._id);

    return await DispatchJob.findById(job._id);
  }

  /**
   * 8. Cancel an eligible dispatch job
   */
  static async cancelDispatch(dispatchJobId, reason = '', initiatedBy = null, initiatedRole = 'Admin') {
    const job = await DispatchJob.findById(dispatchJobId);
    if (!job) {
      const err = new Error('Dispatch job not found');
      err.status = 404;
      throw err;
    }

    if (job.status === 'ASSIGNED') {
      const err = new Error('Cannot cancel dispatch job: Carrier assignment has already been confirmed');
      err.status = 400;
      throw err;
    }

    job.status = 'CANCELLED';
    job.cancellationReason = reason.trim() || 'Cancelled by administrator';
    job.auditLog.push({
      action: 'DISPATCH_CANCELLED',
      performedBy: initiatedBy || null,
      performedModel: initiatedRole === 'Admin' ? 'Admin' : 'System',
      timestamp: new Date(),
      metadata: { reason: job.cancellationReason },
    });

    await job.save();

    // Withdraw all pending offers
    await DispatchOffer.updateMany(
      { dispatchJob: job._id, status: 'PENDING' },
      { $set: { status: 'WITHDRAWN' } }
    );

    return job;
  }

  /**
   * 9. Transporter: List my pending offers
   */
  static async getTransporterPendingOffers(transporterId) {
    await this.expireOffers();

    return await DispatchOffer.find({
      transporter: transporterId,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
      .populate('vehicle', 'registrationNumber manufacturer model payloadCapacityKg cargoBodyDimensions')
      .populate('shipment', 'shipmentReference bookingReference allocatedVehicleCategory')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * 10. Transporter: Get offer details
   */
  static async getTransporterOfferById(offerId, transporterId) {
    await this.expireOffers();

    const offer = await DispatchOffer.findById(offerId)
      .populate('vehicle', 'registrationNumber manufacturer model payloadCapacityKg cargoBodyDimensions')
      .populate('shipment', 'shipmentReference bookingReference allocatedVehicleCategory')
      .populate('dispatchJob', 'dispatchReference status requiredVehicleCategory')
      .lean();

    if (!offer) {
      const err = new Error('Offer not found');
      err.status = 404;
      throw err;
    }

    if (offer.transporter.toString() !== transporterId.toString()) {
      const err = new Error('Forbidden: You are not authorized to view this offer');
      err.status = 403;
      throw err;
    }

    return offer;
  }

  /**
   * 11. Transporter: List assigned jobs
   */
  static async getTransporterAssignments(transporterId) {
    return await DispatchAssignment.find({
      transporter: transporterId,
      assignmentStatus: 'ACTIVE',
    })
      .populate('shipment')
      .populate('vehicle', 'registrationNumber manufacturer model payloadCapacityKg cargoBodyDimensions')
      .populate('dispatchJob', 'dispatchReference status cargoSnapshot pickupLocationSnapshot deliveryLocationSnapshot')
      .sort({ assignedAt: -1 })
      .lean();
  }

  /**
   * 12. Transporter: Get assigned job details
   */
  static async getTransporterAssignmentById(assignmentId, transporterId) {
    const assignment = await DispatchAssignment.findById(assignmentId)
      .populate('shipment')
      .populate('vehicle', 'registrationNumber manufacturer model payloadCapacityKg cargoBodyDimensions')
      .populate('dispatchJob')
      .lean();

    if (!assignment) {
      const err = new Error('Assignment not found');
      err.status = 404;
      throw err;
    }

    if (assignment.transporter.toString() !== transporterId.toString()) {
      const err = new Error('Forbidden: You are not authorized to view this assignment');
      err.status = 403;
      throw err;
    }

    return assignment;
  }

  /**
   * 13. Admin: List dispatch jobs with pagination and filters
   */
  static async listAdminDispatchJobs(queryParams = {}) {
    await this.expireOffers();

    const { status, page = 1, limit = 20 } = queryParams;
    const filter = {};

    if (status && ['PENDING', 'OFFERING', 'ASSIGNED', 'EXHAUSTED', 'CANCELLED'].includes(status)) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, totalCount] = await Promise.all([
      DispatchJob.find(filter)
        .populate('shipment', 'shipmentReference bookingReference shipmentStatus')
        .populate('requiredVehicleCategory', 'name code payloadCapacityKg')
        .populate('assignedTransporter', 'fullname email phone')
        .populate('assignedVehicle', 'registrationNumber manufacturer model payloadCapacityKg')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DispatchJob.countDocuments(filter),
    ]);

    return {
      jobs,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
    };
  }

  /**
   * 14. Admin: Get dispatch job inspection with offer history and assignment
   */
  static async getAdminDispatchJobDetails(dispatchJobId) {
    await this.expireOffers(dispatchJobId);

    const job = await DispatchJob.findById(dispatchJobId)
      .populate('shipment')
      .populate('booking')
      .populate('requiredVehicleCategory')
      .populate('assignedTransporter', 'fullname email phone')
      .populate('assignedVehicle')
      .lean();

    if (!job) {
      const err = new Error('Dispatch job not found');
      err.status = 404;
      throw err;
    }

    const [offers, assignment] = await Promise.all([
      DispatchOffer.find({ dispatchJob: job._id })
        .populate('transporter', 'fullname email phone')
        .populate('vehicle', 'registrationNumber manufacturer model payloadCapacityKg')
        .sort({ createdAt: -1 })
        .lean(),
      DispatchAssignment.findOne({ dispatchJob: job._id })
        .populate('transporter', 'fullname email phone')
        .populate('vehicle')
        .lean(),
    ]);

    return {
      job,
      offers,
      assignment,
    };
  }
}

module.exports = DispatchService;
