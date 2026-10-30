const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicle.service');

/**
 * Retrieve all available commercial vehicle categories
 */
const getCategories = async (req, res, next) => {
  try {
    const categories = await vehicleService.getVehicleCategories();
    return res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
};

/**
 * Add a new commercial vehicle to the authenticated transporter's fleet
 */
const addVehicle = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const transporterId = req.auth.id;
    const vehicle = await vehicleService.createVehicle({
      transporterId,
      vehicleData: req.body,
    });

    return res.status(201).json({
      message: 'Vehicle added to fleet successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List all commercial vehicles belonging to the authenticated transporter
 */
const getMyVehicles = async (req, res, next) => {
  try {
    const transporterId = req.auth.id;
    const filters = {
      availabilityStatus: req.query.availabilityStatus,
      verificationStatus: req.query.verificationStatus,
      isActive: req.query.isActive,
    };

    const vehicles = await vehicleService.getTransporterVehicles(transporterId, filters);
    return res.status(200).json({
      vehicles,
      count: vehicles.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed information for a specific vehicle (enforcing ownership/admin guard)
 */
const getVehicleDetails = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id, req.auth);
    return res.status(200).json({ vehicle });
  } catch (err) {
    next(err);
  }
};

/**
 * Update vehicle specifications and operational details
 */
const updateVehicle = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const vehicle = await vehicleService.updateVehicleDetails(
      req.params.id,
      req.auth.id,
      req.body
    );

    return res.status(200).json({
      message: 'Vehicle details updated successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update operational availability status of a vehicle
 */
const updateAvailability = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { availabilityStatus } = req.body;
    const vehicle = await vehicleService.updateVehicleAvailability(
      req.params.id,
      req.auth.id,
      availabilityStatus
    );

    return res.status(200).json({
      message: 'Vehicle availability updated successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deactivate a vehicle (soft-delete from active fleet)
 */
const deactivateVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.deactivateVehicle(req.params.id, req.auth.id);
    return res.status(200).json({
      message: 'Vehicle deactivated successfully',
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all submitted vehicles across all transporters
 */
const listAdminVehicles = async (req, res, next) => {
  try {
    const result = await vehicleService.listAllVehiclesForAdmin(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Approve or Reject a vehicle's verification
 */
const verifyVehicle = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const adminId = req.auth.id;
    const { decision, rejectionReason, notes } = req.body;

    const vehicle = await vehicleService.reviewVehicleVerification(req.params.id, adminId, {
      decision,
      rejectionReason,
      notes,
    });

    return res.status(200).json({
      message: `Vehicle verification ${decision.toLowerCase()} successfully`,
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCategories,
  addVehicle,
  getMyVehicles,
  getVehicleDetails,
  getAdminVehicleDetails: getVehicleDetails,
  updateVehicle,
  updateAvailability,
  deactivateVehicle,
  listAdminVehicles,
  verifyVehicle,
};
