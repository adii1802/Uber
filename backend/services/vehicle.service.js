const mongoose = require('mongoose');
const vehicleModel = require('../models/vehicle.model');
const VehicleCategory = require('../models/vehicleCategory.model');
const ROLES = require('../constants/roles');

/**
 * Get available commercial vehicle categories (seeds defaults if empty)
 */
const getVehicleCategories = async (includeInactive = false) => {
  await VehicleCategory.seedDefaultCategories();
  const filter = includeInactive ? {} : { isActive: true };
  return await VehicleCategory.find(filter).sort({ 'payloadRange.minKg': 1 });
};

/**
 * Create a new commercial vehicle for the authenticated transporter
 */
const createVehicle = async ({ transporterId, vehicleData }) => {
  if (!transporterId) {
    const error = new Error('Transporter ID is required');
    error.status = 400;
    throw error;
  }

  // 1. Resolve and validate vehicle category
  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(vehicleData.category)) {
    categoryDoc = await VehicleCategory.findById(vehicleData.category);
  } else if (vehicleData.categoryCode) {
    categoryDoc = await VehicleCategory.findOne({
      code: vehicleData.categoryCode.toUpperCase(),
      isActive: true,
    });
  }

  if (!categoryDoc || !categoryDoc.isActive) {
    const error = new Error('Invalid or inactive vehicle category specified');
    error.status = 400;
    throw error;
  }

  // 2. Check for duplicate registration number
  const normalizedReg = vehicleModel.normalizeRegistrationNumber(vehicleData.registrationNumber);
  const existingVehicle = await vehicleModel.findOne({ registrationNumber: normalizedReg });
  if (existingVehicle) {
    const error = new Error(`Vehicle with registration number "${normalizedReg}" is already registered`);
    error.status = 409;
    throw error;
  }

  // 3. Build sanitized vehicle record (enforce server-side ownership & PENDING verification)
  const lengthFt = Number(vehicleData.cargoBodyDimensions?.lengthFt) || 0;
  const widthFt = Number(vehicleData.cargoBodyDimensions?.widthFt) || 0;
  const heightFt = Number(vehicleData.cargoBodyDimensions?.heightFt) || 0;
  const cargoVolumeCuFt = Math.round(lengthFt * widthFt * heightFt);

  const newVehicle = await vehicleModel.create({
    transporter: transporterId,
    registrationNumber: normalizedReg,
    category: categoryDoc._id,
    categoryCode: categoryDoc.code,
    manufacturer: vehicleData.manufacturer?.trim(),
    model: vehicleData.model?.trim(),
    manufacturingYear: Number(vehicleData.manufacturingYear),
    payloadCapacityKg: Number(vehicleData.payloadCapacityKg),
    cargoBodyDimensions: {
      lengthFt,
      widthFt,
      heightFt,
      cargoVolumeCuFt,
      bodyType: vehicleData.cargoBodyDimensions?.bodyType || 'CLOSED_CONTAINER',
    },
    documentReferences: {
      rcNumber: vehicleData.documentReferences?.rcNumber?.trim() || '',
      insuranceNumber: vehicleData.documentReferences?.insuranceNumber?.trim() || '',
      insuranceExpiry: vehicleData.documentReferences?.insuranceExpiry || null,
      fitnessCertExpiry: vehicleData.documentReferences?.fitnessCertExpiry || null,
      permitType: vehicleData.documentReferences?.permitType || 'STATE_PERMIT',
      permitExpiry: vehicleData.documentReferences?.permitExpiry || null,
      vehiclePhotos: Array.isArray(vehicleData.documentReferences?.vehiclePhotos)
        ? vehicleData.documentReferences.vehiclePhotos
        : [],
    },
    verificationStatus: 'PENDING',
    availabilityStatus: vehicleData.availabilityStatus || 'AVAILABLE',
    isActive: true,
  });

  return await newVehicle.populate('category');
};

/**
 * List vehicles belonging exclusively to the authenticated transporter
 */
const getTransporterVehicles = async (transporterId, filters = {}) => {
  const query = { transporter: transporterId };

  if (filters.availabilityStatus) {
    query.availabilityStatus = filters.availabilityStatus;
  }

  if (filters.verificationStatus) {
    query.verificationStatus = filters.verificationStatus;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  return await vehicleModel
    .find(query)
    .populate('category')
    .sort({ createdAt: -1 });
};

/**
 * Get detailed vehicle information with object-level authorization
 */
const getVehicleById = async (vehicleId, requestingAccount) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    const error = new Error('Invalid vehicle ID format');
    error.status = 400;
    throw error;
  }

  const vehicle = await vehicleModel
    .findById(vehicleId)
    .populate('category')
    .populate('transporter', 'fullname email phone');

  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    throw error;
  }

  // Authorization check: Admins can view any vehicle; transporters can only view their own
  const isOwner =
    requestingAccount &&
    vehicle.transporter &&
    (vehicle.transporter._id || vehicle.transporter).toString() === requestingAccount.id.toString();

  const isAdmin = requestingAccount && requestingAccount.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    const error = new Error('Forbidden: You do not have permission to access this vehicle');
    error.status = 403;
    throw error;
  }

  return vehicle;
};

/**
 * Update vehicle details by the owning transporter
 * (Guards against privilege escalation or ownership alteration)
 */
const updateVehicleDetails = async (vehicleId, transporterId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    const error = new Error('Invalid vehicle ID format');
    error.status = 400;
    throw error;
  }

  const vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    throw error;
  }

  // Verify ownership
  if (vehicle.transporter.toString() !== transporterId.toString()) {
    const error = new Error('Forbidden: You cannot modify another transporter’s vehicle');
    error.status = 403;
    throw error;
  }

  // Validate category if updating category
  if (updateData.category && updateData.category.toString() !== vehicle.category.toString()) {
    const categoryDoc = await VehicleCategory.findById(updateData.category);
    if (!categoryDoc || !categoryDoc.isActive) {
      const error = new Error('Invalid or inactive vehicle category specified');
      error.status = 400;
      throw error;
    }
    vehicle.category = categoryDoc._id;
    vehicle.categoryCode = categoryDoc.code;
  }

  // Update allowed fields
  if (updateData.manufacturer) vehicle.manufacturer = updateData.manufacturer.trim();
  if (updateData.model) vehicle.model = updateData.model.trim();
  if (updateData.manufacturingYear) vehicle.manufacturingYear = Number(updateData.manufacturingYear);
  if (updateData.payloadCapacityKg) vehicle.payloadCapacityKg = Number(updateData.payloadCapacityKg);

  if (updateData.cargoBodyDimensions) {
    const length = Number(updateData.cargoBodyDimensions.lengthFt) || vehicle.cargoBodyDimensions.lengthFt;
    const width = Number(updateData.cargoBodyDimensions.widthFt) || vehicle.cargoBodyDimensions.widthFt;
    const height = Number(updateData.cargoBodyDimensions.heightFt) || vehicle.cargoBodyDimensions.heightFt;

    vehicle.cargoBodyDimensions = {
      lengthFt: length,
      widthFt: width,
      heightFt: height,
      cargoVolumeCuFt: Math.round(length * width * height),
      bodyType: updateData.cargoBodyDimensions.bodyType || vehicle.cargoBodyDimensions.bodyType,
    };
  }

  if (updateData.documentReferences) {
    vehicle.documentReferences = {
      ...vehicle.documentReferences.toObject(),
      ...updateData.documentReferences,
    };
  }

  await vehicle.save();
  return await vehicle.populate('category');
};

/**
 * Update vehicle availability status
 */
const updateVehicleAvailability = async (vehicleId, transporterId, availabilityStatus) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    const error = new Error('Invalid vehicle ID format');
    error.status = 400;
    throw error;
  }

  const validStatuses = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'UNAVAILABLE'];
  if (!validStatuses.includes(availabilityStatus)) {
    const error = new Error(`Invalid availability status. Must be one of: ${validStatuses.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    throw error;
  }

  if (vehicle.transporter.toString() !== transporterId.toString()) {
    const error = new Error('Forbidden: You cannot modify another transporter’s vehicle');
    error.status = 403;
    throw error;
  }

  vehicle.availabilityStatus = availabilityStatus;
  await vehicle.save();
  return vehicle;
};

/**
 * Deactivate vehicle (soft delete)
 */
const deactivateVehicle = async (vehicleId, transporterId) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    const error = new Error('Invalid vehicle ID format');
    error.status = 400;
    throw error;
  }

  const vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    throw error;
  }

  if (vehicle.transporter.toString() !== transporterId.toString()) {
    const error = new Error('Forbidden: You cannot deactivate another transporter’s vehicle');
    error.status = 403;
    throw error;
  }

  vehicle.isActive = false;
  vehicle.availabilityStatus = 'UNAVAILABLE';
  await vehicle.save();
  return vehicle;
};

/**
 * Admin: List all submitted vehicles across all transporters
 */
const listAllVehiclesForAdmin = async ({ status, categoryCode, search, page = 1, limit = 20 }) => {
  const query = {};

  if (status) {
    query.verificationStatus = status.toUpperCase();
  }

  if (categoryCode) {
    query.categoryCode = categoryCode.toUpperCase();
  }

  if (search) {
    const cleanSearch = search.trim();
    query.$or = [
      { registrationNumber: { $regex: cleanSearch, $options: 'i' } },
      { manufacturer: { $regex: cleanSearch, $options: 'i' } },
      { model: { $regex: cleanSearch, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const total = await vehicleModel.countDocuments(query);

  const vehicles = await vehicleModel
    .find(query)
    .populate('transporter', 'fullname email phone')
    .populate('category')
    .populate('verificationDetails.reviewedBy', 'fullname email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    vehicles,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    },
  };
};

/**
 * Admin: Approve or Reject vehicle verification
 */
const reviewVehicleVerification = async (vehicleId, adminId, { decision, rejectionReason, notes }) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    const error = new Error('Invalid vehicle ID format');
    error.status = 400;
    throw error;
  }

  const normalizedDecision = decision?.toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedDecision)) {
    const error = new Error('Verification decision must be either "APPROVED" or "REJECTED"');
    error.status = 400;
    throw error;
  }

  if (normalizedDecision === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    const error = new Error('Rejection reason is required when rejecting vehicle verification');
    error.status = 400;
    throw error;
  }

  const vehicle = await vehicleModel.findById(vehicleId);
  if (!vehicle) {
    const error = new Error('Vehicle not found');
    error.status = 404;
    throw error;
  }

  vehicle.verificationStatus = normalizedDecision;
  vehicle.verificationDetails = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    rejectionReason: normalizedDecision === 'REJECTED' ? rejectionReason.trim() : '',
    notes: notes ? notes.trim() : '',
  };

  await vehicle.save();
  return await vehicle.populate([
    { path: 'transporter', select: 'fullname email phone' },
    { path: 'category' },
    { path: 'verificationDetails.reviewedBy', select: 'fullname email' },
  ]);
};

module.exports = {
  getVehicleCategories,
  createVehicle,
  getTransporterVehicles,
  getVehicleById,
  updateVehicleDetails,
  updateVehicleAvailability,
  deactivateVehicle,
  listAllVehiclesForAdmin,
  reviewVehicleVerification,
};
