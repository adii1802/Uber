const mongoose = require('mongoose');
const CargoBooking = require('../models/cargoBooking.model');
const Shipment = require('../models/shipment.model');

/**
 * Valid allowed state transitions map
 */
const ALLOWED_TRANSITIONS = {
  REQUESTED: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
  EXPIRED: [],
};

/**
 * Validate whether a state transition is permitted
 */
const isTransitionAllowed = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
};

/**
 * Centralized Booking State Transition Engine
 */
class BookingStateService {
  /**
   * Confirm a REQUESTED booking and atomically create its linked Shipment consignment.
   * Concurrency-safe: Exactly one process can transition REQUESTED -> CONFIRMED.
   */
  static async confirmBooking(bookingId, adminId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err = new Error('Invalid booking ID format');
      err.status = 400;
      throw err;
    }

    // 1. Atomic Compare-and-Swap (CAS): Only succeeds if status is currently REQUESTED
    const booking = await CargoBooking.findOneAndUpdate(
      { _id: bookingId, bookingStatus: 'REQUESTED' },
      {
        $set: {
          bookingStatus: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      },
      { new: true }
    ).populate('requestedVehicleCategory');

    if (!booking) {
      // Check current state to provide precise diagnostic error
      const existing = await CargoBooking.findById(bookingId);
      if (!existing) {
        const err = new Error('Booking not found');
        err.status = 404;
        throw err;
      }
      const err = new Error(
        `Invalid state transition: Cannot confirm booking in '${existing.bookingStatus}' status`
      );
      err.status = 400;
      throw err;
    }

    // 2. Concurrency-Safe Shipment Creation (Guaranteed by unique index on shipment.booking)
    try {
      // Check if shipment already exists (idempotency guard)
      let shipment = await Shipment.findOne({ booking: booking._id });
      if (!shipment) {
        shipment = await Shipment.create({
          booking: booking._id,
          bookingReference: booking.bookingReference,
          customer: booking.customer,
          pickup: booking.pickup,
          dropoff: booking.dropoff,
          cargo: booking.cargo,
          allocatedVehicleCategory: booking.requestedVehicleCategory._id || booking.requestedVehicleCategory,
          shipmentStatus: 'CREATED',
          timeline: [
            {
              status: 'CREATED',
              timestamp: new Date(),
              notes: 'Commercial consignment created upon administrative booking confirmation.',
            },
          ],
        });
      }

      // 3. Link shipment reference back to booking
      booking.shipment = shipment._id;
      await booking.save();

      return { booking, shipment };
    } catch (creationError) {
      // If duplicate key error on shipment.booking, another concurrent worker already created it
      if (creationError.code === 11000) {
        const existingShipment = await Shipment.findOne({ booking: booking._id });
        if (existingShipment) {
          booking.shipment = existingShipment._id;
          await booking.save();
          return { booking, shipment: existingShipment };
        }
      }

      // Compensation / rollback step if shipment creation failed unexpectedly
      await CargoBooking.findByIdAndUpdate(bookingId, {
        $set: { bookingStatus: 'REQUESTED', confirmedAt: null },
      });
      throw creationError;
    }
  }

  /**
   * Cancel an eligible booking (Customer or Admin)
   */
  static async cancelBooking(bookingId, { actorRole, cancellationReason, requestingUserId }) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      const err = new Error('Invalid booking ID format');
      err.status = 400;
      throw err;
    }

    const booking = await CargoBooking.findById(bookingId);
    if (!booking) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }

    // Verify ownership if cancelled by customer
    if (actorRole === 'CUSTOMER' && booking.customer.toString() !== requestingUserId.toString()) {
      const err = new Error('Forbidden: You cannot cancel another customer’s booking');
      err.status = 403;
      throw err;
    }

    // Validate state transition
    if (!isTransitionAllowed(booking.bookingStatus, 'CANCELLED')) {
      const err = new Error(
        `Invalid state transition: Cannot cancel booking in '${booking.bookingStatus}' status`
      );
      err.status = 400;
      throw err;
    }

    booking.bookingStatus = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancellationReason = cancellationReason ? cancellationReason.trim() : 'Cancelled by user';
    booking.cancellationParty = actorRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';

    await booking.save();

    // If a linked shipment exists and has not started transit, update shipment to EXCEPTION
    if (booking.shipment) {
      await Shipment.findOneAndUpdate(
        { _id: booking.shipment, shipmentStatus: 'CREATED' },
        {
          $set: { shipmentStatus: 'EXCEPTION' },
          $push: {
            timeline: {
              status: 'EXCEPTION',
              timestamp: new Date(),
              notes: `Linked booking cancelled by ${booking.cancellationParty}: ${booking.cancellationReason}`,
            },
          },
        }
      );
    }

    return booking;
  }
}

module.exports = {
  BookingStateService,
  ALLOWED_TRANSITIONS,
  isTransitionAllowed,
};
