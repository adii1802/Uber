const { validationResult } = require('express-validator');
const dispatchService = require('../services/dispatch.service');

/**
 * ==========================================
 * TRANSPORTER DISPATCH ENDPOINTS
 * ==========================================
 */

/**
 * List active pending job offers for authenticated transporter
 * GET /dispatch/offers
 */
const getMyOffers = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const offers = await dispatchService.getTransporterPendingOffers(transporterId);

    return res.status(200).json({
      offers,
      count: offers.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get offer details
 * GET /dispatch/offers/:id
 */
const getOfferDetails = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const offer = await dispatchService.getTransporterOfferById(req.params.id, transporterId);

    return res.status(200).json({ offer });
  } catch (err) {
    next(err);
  }
};

/**
 * Accept a dispatch offer
 * POST /dispatch/offers/:id/accept
 */
const acceptOffer = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const metadata = {
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
    };

    const result = await dispatchService.acceptOffer(req.params.id, transporterId, metadata);

    return res.status(200).json({
      message: 'Offer accepted successfully. Shipment assigned.',
      assignment: result.assignment,
      offer: result.offer,
      dispatchJob: result.dispatchJob,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject a dispatch offer
 * POST /dispatch/offers/:id/reject
 */
const rejectOffer = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const { rejectionReason } = req.body;

    const offer = await dispatchService.rejectOffer(req.params.id, transporterId, rejectionReason);

    return res.status(200).json({
      message: 'Offer rejected',
      offer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List assigned jobs for authenticated transporter
 * GET /dispatch/jobs
 */
const getMyAssignedJobs = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const assignments = await dispatchService.getTransporterAssignments(transporterId);

    return res.status(200).json({
      assignments,
      count: assignments.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get assigned job details
 * GET /dispatch/jobs/:id
 */
const getAssignedJobDetails = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const assignment = await dispatchService.getTransporterAssignmentById(req.params.id, transporterId);

    return res.status(200).json({ assignment });
  } catch (err) {
    next(err);
  }
};

/**
 * ==========================================
 * ADMIN DISPATCH OPERATIONS ENDPOINTS
 * ==========================================
 */

/**
 * Initiate dispatch operation for confirmed shipment
 * POST /admin/dispatch/:shipmentId
 */
const initiateDispatch = async (req, res, next) => {
  try {
    const adminId = req.auth.id;
    const dispatchJob = await dispatchService.createDispatchJob(
      req.params.shipmentId,
      adminId,
      'Admin'
    );

    return res.status(201).json({
      message: 'Dispatch job initiated successfully',
      dispatchJob,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List dispatch jobs with pagination and filters
 * GET /admin/dispatch/jobs
 */
const listDispatchJobs = async (req, res, next) => {
  try {
    const result = await dispatchService.listAdminDispatchJobs(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Inspect dispatch job details with offers and assignment history
 * GET /admin/dispatch/jobs/:id
 */
const getDispatchJobDetails = async (req, res, next) => {
  try {
    const details = await dispatchService.getAdminDispatchJobDetails(req.params.id);
    return res.status(200).json(details);
  } catch (err) {
    next(err);
  }
};

/**
 * Retry an exhausted dispatch job
 * POST /admin/dispatch/jobs/:id/retry
 */
const retryDispatch = async (req, res, next) => {
  try {
    const adminId = req.auth.id;
    const dispatchJob = await dispatchService.retryDispatch(req.params.id, adminId, 'Admin');

    return res.status(200).json({
      message: 'Dispatch operation retried successfully',
      dispatchJob,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel an eligible dispatch job
 * POST /admin/dispatch/jobs/:id/cancel
 */
const cancelDispatch = async (req, res, next) => {
  try {
    const adminId = req.auth.id;
    const { reason } = req.body;
    const dispatchJob = await dispatchService.cancelDispatch(
      req.params.id,
      reason,
      adminId,
      'Admin'
    );

    return res.status(200).json({
      message: 'Dispatch job cancelled successfully',
      dispatchJob,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Transporter
  getMyOffers,
  getOfferDetails,
  acceptOffer,
  rejectOffer,
  getMyAssignedJobs,
  getAssignedJobDetails,
  // Admin
  initiateDispatch,
  listDispatchJobs,
  getDispatchJobDetails,
  retryDispatch,
  cancelDispatch,
};
