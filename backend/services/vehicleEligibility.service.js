const vehicleModel = require('../models/vehicle.model');

/**
 * REJECTION REASON CONSTANTS
 */
const ELIGIBILITY_REJECTIONS = {
  TRANSPORTER_INACTIVE: 'TRANSPORTER_INACTIVE',
  VEHICLE_INACTIVE: 'VEHICLE_INACTIVE',
  VEHICLE_NOT_VERIFIED: 'VEHICLE_NOT_VERIFIED',
  VEHICLE_UNAVAILABLE: 'VEHICLE_UNAVAILABLE',
  CATEGORY_MISMATCH: 'CATEGORY_MISMATCH',
  INSUFFICIENT_PAYLOAD_CAPACITY: 'INSUFFICIENT_PAYLOAD_CAPACITY',
  DIMENSION_MISMATCH: 'DIMENSION_MISMATCH',
  HANDLING_INCAPABLE: 'HANDLING_INCAPABLE',
};

/**
 * Evaluate single vehicle eligibility against specific commercial cargo requirements
 *
 * @param {Object} vehicle - Populated or unpopulated Vehicle document
 * @param {Object} requirements - Cargo requirements:
 *   {
 *     requiredVehicleCategory: ObjectId|string,
 *     requiredPayloadKg: number,
 *     dimensions?: { lengthFt?: number, widthFt?: number, heightFt?: number },
 *     isFragile?: boolean,
 *     packagingType?: string
 *   }
 * @returns {Object} { isEligible: boolean, rejectionReasons: string[], diagnostics: Object }
 */
const evaluateVehicleEligibility = (vehicle, requirements = {}) => {
  const rejectionReasons = [];

  if (!vehicle) {
    return {
      isEligible: false,
      rejectionReasons: [ELIGIBILITY_REJECTIONS.VEHICLE_INACTIVE],
      diagnostics: { error: 'Vehicle not provided' },
    };
  }

  // 1. Transporter Account Active Check
  if (vehicle.transporter) {
    // If transporter is populated as an object
    if (typeof vehicle.transporter === 'object' && vehicle.transporter.isActive === false) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.TRANSPORTER_INACTIVE);
    }
  }

  // 2. Vehicle Active Check
  if (vehicle.isActive === false) {
    rejectionReasons.push(ELIGIBILITY_REJECTIONS.VEHICLE_INACTIVE);
  }

  // 3. Verification Status Check (Must be APPROVED)
  if (vehicle.verificationStatus !== 'APPROVED') {
    rejectionReasons.push(ELIGIBILITY_REJECTIONS.VEHICLE_NOT_VERIFIED);
  }

  // 4. Availability Status Check (Must be AVAILABLE)
  if (vehicle.availabilityStatus !== 'AVAILABLE') {
    rejectionReasons.push(ELIGIBILITY_REJECTIONS.VEHICLE_UNAVAILABLE);
  }

  // 5. Category Compatibility Check
  if (requirements.requiredVehicleCategory) {
    const vehicleCatId = vehicle.category?._id
      ? vehicle.category._id.toString()
      : vehicle.category
      ? vehicle.category.toString()
      : null;

    const requiredCatId = requirements.requiredVehicleCategory?._id
      ? requirements.requiredVehicleCategory._id.toString()
      : requirements.requiredVehicleCategory.toString();

    if (!vehicleCatId || vehicleCatId !== requiredCatId) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.CATEGORY_MISMATCH);
    }
  }

  // 6. Payload Capacity Check
  if (requirements.requiredPayloadKg != null) {
    const requiredWeight = Number(requirements.requiredPayloadKg);
    const vehiclePayload = Number(vehicle.payloadCapacityKg || 0);

    if (vehiclePayload < requiredWeight) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.INSUFFICIENT_PAYLOAD_CAPACITY);
    }
  }

  // 7. Cargo Dimension Check (Length, Width, Height)
  if (requirements.dimensions) {
    const cargoLen = Number(requirements.dimensions.lengthFt || 0);
    const cargoWid = Number(requirements.dimensions.widthFt || 0);
    const cargoHgt = Number(requirements.dimensions.heightFt || 0);

    const vehLen = Number(vehicle.cargoBodyDimensions?.lengthFt || 0);
    const vehWid = Number(vehicle.cargoBodyDimensions?.widthFt || 0);
    const vehHgt = Number(vehicle.cargoBodyDimensions?.heightFt || 0);

    if (cargoLen > 0 && vehLen > 0 && vehLen < cargoLen) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.DIMENSION_MISMATCH);
    } else if (cargoWid > 0 && vehWid > 0 && vehWid < cargoWid) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.DIMENSION_MISMATCH);
    } else if (cargoHgt > 0 && vehHgt > 0 && vehHgt < cargoHgt) {
      rejectionReasons.push(ELIGIBILITY_REJECTIONS.DIMENSION_MISMATCH);
    }
  }

  // 8. Fragile & Body Type Handling Check (Optional)
  if (requirements.isFragile && vehicle.cargoBodyDimensions?.bodyType === 'OPEN_BED') {
    // Open bed without enclosure cannot safely carry fragile commercial freight
    rejectionReasons.push(ELIGIBILITY_REJECTIONS.HANDLING_INCAPABLE);
  }

  const isEligible = rejectionReasons.length === 0;

  return {
    isEligible,
    rejectionReasons,
    diagnostics: {
      vehicleId: vehicle._id,
      registrationNumber: vehicle.registrationNumber,
      payloadCapacityKg: vehicle.payloadCapacityKg,
      requiredPayloadKg: requirements.requiredPayloadKg,
      verificationStatus: vehicle.verificationStatus,
      availabilityStatus: vehicle.availabilityStatus,
      isActive: vehicle.isActive,
    },
  };
};

/**
 * Find all verified, eligible vehicles capable of fulfilling cargo requirements
 *
 * @param {Object} requirements - Cargo requirements
 * @param {Object} options - Filtering options { excludeTransporterIds?: string[], limit?: number }
 * @returns {Promise<Object>} { eligibleVehicles: Vehicle[], evaluatedCount: number, rejections: Object }
 */
const findEligibleVehicles = async (requirements, options = {}) => {
  const query = {
    isActive: true,
    verificationStatus: 'APPROVED',
    availabilityStatus: 'AVAILABLE',
  };

  // If specific category required
  if (requirements.requiredVehicleCategory) {
    query.category = requirements.requiredVehicleCategory;
  }

  // Minimum payload filter at DB level for optimization
  if (requirements.requiredPayloadKg) {
    query.payloadCapacityKg = { $gte: Number(requirements.requiredPayloadKg) };
  }

  // Transporter exclusion filter (e.g. transporters who already rejected or hold pending offers)
  if (options.excludeTransporterIds && options.excludeTransporterIds.length > 0) {
    query.transporter = { $nin: options.excludeTransporterIds };
  }

  if (options.excludeVehicleIds && options.excludeVehicleIds.length > 0) {
    query._id = { $nin: options.excludeVehicleIds };
  }

  // Fetch candidate vehicles with populated transporter and category
  const candidateVehicles = await vehicleModel
    .find(query)
    .populate('transporter', 'fullname email phone isActive location')
    .populate('category', 'name code payloadCapacityKg dimensions volumeCapacityCuFt')
    .lean();

  const eligibleVehicles = [];
  const rejections = {};

  for (const vehicle of candidateVehicles) {
    const evaluation = evaluateVehicleEligibility(vehicle, requirements);
    if (evaluation.isEligible) {
      eligibleVehicles.push(vehicle);
    } else {
      rejections[vehicle._id] = evaluation.rejectionReasons;
    }
  }

  return {
    eligibleVehicles,
    evaluatedCount: candidateVehicles.length,
    eligibleCount: eligibleVehicles.length,
    rejections,
  };
};

module.exports = {
  ELIGIBILITY_REJECTIONS,
  evaluateVehicleEligibility,
  findEligibleVehicles,
};
