const crypto = require('crypto');
const mongoose = require('mongoose');
const CargoBooking = require('../models/cargoBooking.model');
const VehicleCategory = require('../models/vehicleCategory.model');
const IdempotencyRecord = require('../models/idempotency.model');
const { BookingStateService } = require('./bookingState.service');
const ROLES = require('../constants/roles');

/**
 * Generate canonical hash for idempotency payload verification
 */
const computeRequestHash = (payload) => {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
};

/**
 * Create a new commercial cargo booking request (with Idempotency support)
 */
const createBooking = async ({ customerId, bookingData, idempotencyKey = null }) => {
  if (!customerId) {
    const err = new Error('Customer ID is required');
    err.status = 400;
    throw err;
  }

  // 1. Idempotency Check
  const requestHash = computeRequestHash(bookingData);
  if (idempotencyKey) {
    const cleanKey = idempotencyKey.trim();
    const existingRecord = await IdempotencyRecord.findOne({
      key: cleanKey,
      customer: customerId,
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        const conflictErr = new Error(
          'Conflict: Idempotency key already used with a different request payload'
        );
        conflictErr.status = 409;
        throw conflictErr;
      }
      // Return cached response seamlessly
      return {
        booking: existingRecord.responseBody.booking,
        isCachedResponse: true,
      };
    }
  }

  // 2. Validate Vehicle Category
  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(bookingData.requestedVehicleCategory)) {
    categoryDoc = await VehicleCategory.findById(bookingData.requestedVehicleCategory);
  } else if (bookingData.categoryCode) {
    categoryDoc = await VehicleCategory.findOne({
      code: bookingData.categoryCode.toUpperCase(),
      isActive: true,
    });
  }

  if (!categoryDoc || !categoryDoc.isActive) {
    const err = new Error('Invalid or inactive commercial vehicle category requested');
    err.status = 400;
    throw err;
  }

  // 3. Validate Dimensions & Volume calculation
  const lengthFt = Number(bookingData.cargo?.dimensions?.lengthFt) || 0;
  const widthFt = Number(bookingData.cargo?.dimensions?.widthFt) || 0;
  const heightFt = Number(bookingData.cargo?.dimensions?.heightFt) || 0;
  const volumeCuFt = Math.round(lengthFt * widthFt * heightFt);

  // 4. Create Booking Document
  const booking = await CargoBooking.create({
    customer: customerId,
    pickup: bookingData.pickup,
    dropoff: bookingData.dropoff,
    cargo: {
      name: bookingData.cargo?.name?.trim(),
      category: bookingData.cargo?.category || 'GENERAL_CARGO',
      weightKg: Number(bookingData.cargo?.weightKg),
      dimensions: {
        lengthFt,
        widthFt,
        heightFt,
        volumeCuFt,
      },
      packageCount: Number(bookingData.cargo?.packageCount) || 1,
      packagingType: bookingData.cargo?.packagingType || 'BOXES_CARTONS',
      isFragile: Boolean(bookingData.cargo?.isFragile),
      handlingInstructions: bookingData.cargo?.handlingInstructions?.trim() || '',
    },
    requestedVehicleCategory: categoryDoc._id,
    categoryCode: categoryDoc.code,
    requestedPickupAt: new Date(bookingData.requestedPickupAt),
    specialInstructions: bookingData.specialInstructions?.trim() || '',
    bookingStatus: 'REQUESTED',
    idempotencyKey: idempotencyKey ? idempotencyKey.trim() : null,
  });

  const populatedBooking = await booking.populate('requestedVehicleCategory');

  // 5. Save Idempotency Record if key was provided
  if (idempotencyKey) {
    try {
      await IdempotencyRecord.create({
        key: idempotencyKey.trim(),
        customer: customerId,
        requestHash,
        statusCode: 201,
        responseBody: {
          booking: populatedBooking,
        },
      });
    } catch (saveErr) {
      // Ignore duplicate key race in idempotency log
    }
  }

  return {
    booking: populatedBooking,
    isCachedResponse: false,
  };
};

/**
 * List all bookings belonging to the authenticated customer
 */
const getCustomerBookings = async (customerId, filters = {}) => {
  const query = { customer: customerId };

  if (filters.status) {
    query.bookingStatus = filters.status.toUpperCase();
  }

  return await CargoBooking.find(query)
    .populate('requestedVehicleCategory')
    .populate('shipment', 'shipmentReference shipmentStatus timeline createdAt')
    .sort({ createdAt: -1 });
};

/**
 * Get detailed booking information by ID with ownership enforcement
 */
const getBookingById = async (bookingId, requestingAccount) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const err = new Error('Invalid booking ID format');
    err.status = 400;
    throw err;
  }

  const booking = await CargoBooking.findById(bookingId)
    .populate('customer', 'fullname email phone')
    .populate('requestedVehicleCategory')
    .populate('shipment');

  if (!booking) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const isOwner =
    requestingAccount &&
    booking.customer &&
    (booking.customer._id || booking.customer).toString() === requestingAccount.id.toString();

  const isAdmin = requestingAccount && requestingAccount.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden: You do not have permission to access this booking');
    err.status = 403;
    throw err;
  }

  return booking;
};

/**
 * Cancel a booking by the customer
 */
const cancelCustomerBooking = async (bookingId, customerId, cancellationReason) => {
  return await BookingStateService.cancelBooking(bookingId, {
    actorRole: 'CUSTOMER',
    cancellationReason,
    requestingUserId: customerId,
  });
};

/**
 * Admin: List all commercial cargo bookings with pagination and filters
 */
const listAllBookingsForAdmin = async ({ status, search, page = 1, limit = 20 }) => {
  const query = {};

  if (status) {
    query.bookingStatus = status.toUpperCase();
  }

  if (search) {
    const clean = search.trim();
    query.$or = [
      { bookingReference: { $regex: clean, $options: 'i' } },
      { 'pickup.city': { $regex: clean, $options: 'i' } },
      { 'dropoff.city': { $regex: clean, $options: 'i' } },
      { 'cargo.name': { $regex: clean, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const total = await CargoBooking.countDocuments(query);

  const bookings = await CargoBooking.find(query)
    .populate('customer', 'fullname email phone')
    .populate('requestedVehicleCategory')
    .populate('shipment', 'shipmentReference shipmentStatus')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    bookings,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

module.exports = {
  createBooking,
  getCustomerBookings,
  getBookingById,
  cancelCustomerBooking,
  listAllBookingsForAdmin,
};
