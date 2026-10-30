const { validationResult } = require('express-validator');
const bookingService = require('../services/booking.service');
const { BookingStateService } = require('../services/bookingState.service');

/**
 * Customer: Create a new cargo booking request
 */
const createBooking = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const customerId = req.auth.id;
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'] || null;

    const result = await bookingService.createBooking({
      customerId,
      bookingData: req.body,
      idempotencyKey,
    });

    if (result.isCachedResponse) {
      res.setHeader('X-Cache-Lookup', 'HIT');
    }

    return res.status(201).json({
      message: 'Cargo booking request created successfully',
      booking: result.booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer: List all bookings for authenticated customer
 */
const getMyBookings = async (req, res, next) => {
  try {
    const customerId = req.auth.id;
    const bookings = await bookingService.getCustomerBookings(customerId, req.query);
    return res.status(200).json({
      bookings,
      count: bookings.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer / Admin: Retrieve booking details
 */
const getBookingDetails = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id, req.auth);
    return res.status(200).json({ booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer: Cancel an eligible booking
 */
const cancelBooking = async (req, res, next) => {
  try {
    const customerId = req.auth.id;
    const { cancellationReason } = req.body;

    const booking = await bookingService.cancelCustomerBooking(
      req.params.id,
      customerId,
      cancellationReason
    );

    return res.status(200).json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all bookings with pagination and filters
 */
const listAdminBookings = async (req, res, next) => {
  try {
    const result = await bookingService.listAllBookingsForAdmin(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Confirm or Cancel eligible booking
 */
const updateBookingStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, reason } = req.body;
    const adminId = req.auth.id;

    if (status === 'CONFIRMED') {
      const result = await BookingStateService.confirmBooking(req.params.id, adminId);
      return res.status(200).json({
        message: 'Booking confirmed and commercial shipment consignment created successfully',
        booking: result.booking,
        shipment: result.shipment,
      });
    }

    if (status === 'CANCELLED') {
      const booking = await BookingStateService.cancelBooking(req.params.id, {
        actorRole: 'ADMIN',
        cancellationReason: reason || 'Administrative cancellation',
        requestingUserId: adminId,
      });
      return res.status(200).json({
        message: 'Booking cancelled by administrator',
        booking,
      });
    }

    return res.status(400).json({
      message: 'Invalid target status. Permitted transitions are CONFIRMED or CANCELLED',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  listAdminBookings,
  updateBookingStatus,
};
