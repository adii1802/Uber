const mongoose = require('mongoose');
const Shipment = require('../models/shipment.model');
const ROLES = require('../constants/roles');

/**
 * List shipments belonging to the authenticated customer
 */
const getCustomerShipments = async (customerId, filters = {}) => {
  const query = { customer: customerId };

  if (filters.status) {
    query.shipmentStatus = filters.status.toUpperCase();
  }

  return await Shipment.find(query)
    .populate('booking', 'bookingReference bookingStatus requestedPickupAt')
    .populate('allocatedVehicleCategory')
    .sort({ createdAt: -1 });
};

/**
 * Get detailed shipment information by ID with ownership verification
 */
const getShipmentById = async (shipmentId, requestingAccount) => {
  if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
    const err = new Error('Invalid shipment ID format');
    err.status = 400;
    throw err;
  }

  const shipment = await Shipment.findById(shipmentId)
    .populate('customer', 'fullname email phone')
    .populate('booking')
    .populate('allocatedVehicleCategory');

  if (!shipment) {
    const err = new Error('Shipment not found');
    err.status = 404;
    throw err;
  }

  const isOwner =
    requestingAccount &&
    shipment.customer &&
    (shipment.customer._id || shipment.customer).toString() === requestingAccount.id.toString();

  const isAdmin = requestingAccount && requestingAccount.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    const err = new Error('Forbidden: You do not have permission to access this shipment');
    err.status = 403;
    throw err;
  }

  return shipment;
};

/**
 * Admin: List all shipments across all customers with pagination
 */
const listAllShipmentsForAdmin = async ({ status, search, page = 1, limit = 20 }) => {
  const query = {};

  if (status) {
    query.shipmentStatus = status.toUpperCase();
  }

  if (search) {
    const clean = search.trim();
    query.$or = [
      { shipmentReference: { $regex: clean, $options: 'i' } },
      { bookingReference: { $regex: clean, $options: 'i' } },
      { 'pickup.city': { $regex: clean, $options: 'i' } },
      { 'dropoff.city': { $regex: clean, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const total = await Shipment.countDocuments(query);

  const shipments = await Shipment.find(query)
    .populate('customer', 'fullname email phone')
    .populate('booking', 'bookingReference bookingStatus')
    .populate('allocatedVehicleCategory')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    shipments,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

module.exports = {
  getCustomerShipments,
  getShipmentById,
  listAllShipmentsForAdmin,
};
