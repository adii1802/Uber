/**
 * Standard Commercial Vehicle Categories for CargoRide (India)
 * 
 * Configurable category specifications reflecting commercial cargo logistics.
 * (Illustrative operational ranges for commercial payload and volumetric sizing).
 */
const DEFAULT_VEHICLE_CATEGORIES = [
  {
    name: 'Three-Wheeler Cargo',
    code: 'THREE_WHEELER',
    description: 'Intra-city last-mile cargo delivery auto (e.g. Piaggio Ape, Bajaj Maxima C, Mahindra Treo Zor)',
    vehicleType: 'three-wheeler',
    payloadRange: {
      minKg: 350,
      maxKg: 650,
    },
    cargoDimensions: {
      lengthFt: 5.5,
      widthFt: 4.5,
      heightFt: 4.0,
      cargoVolumeCuFt: 99,
    },
    supportedBodyTypes: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED'],
    isActive: true,
  },
  {
    name: 'Mini Truck (Tata Ace Category)',
    code: 'MINI_TRUCK',
    description: 'Entry-level light cargo vehicle for intra-city distribution (e.g. Tata Ace Gold, Mahindra Supro Mini)',
    vehicleType: 'mini-truck',
    payloadRange: {
      minKg: 750,
      maxKg: 1000,
    },
    cargoDimensions: {
      lengthFt: 7.0,
      widthFt: 4.8,
      heightFt: 4.5,
      cargoVolumeCuFt: 151,
    },
    supportedBodyTypes: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'REFRIGERATED_CONTAINER'],
    isActive: true,
  },
  {
    name: 'Pickup Truck (Bolero Pickup Category)',
    code: 'PICKUP_TRUCK',
    description: 'High-payload commercial pickup for city and semi-urban cargo transit (e.g. Mahindra Bolero Maxi Truck, Isuzu D-Max)',
    vehicleType: 'pickup',
    payloadRange: {
      minKg: 1200,
      maxKg: 1750,
    },
    cargoDimensions: {
      lengthFt: 8.2,
      widthFt: 5.2,
      heightFt: 5.0,
      cargoVolumeCuFt: 213,
    },
    supportedBodyTypes: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED'],
    isActive: true,
  },
  {
    name: 'Light Commercial Vehicle (LCV - 10 to 14 ft)',
    code: 'LCV',
    description: 'Intermediate industrial and inter-city cargo transit truck (e.g. Tata 407, Eicher Pro 2049, Ashok Leyland Partner)',
    vehicleType: 'lcv',
    payloadRange: {
      minKg: 2500,
      maxKg: 4500,
    },
    cargoDimensions: {
      lengthFt: 12.0,
      widthFt: 6.0,
      heightFt: 6.0,
      cargoVolumeCuFt: 432,
    },
    supportedBodyTypes: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'REFRIGERATED_CONTAINER'],
    isActive: true,
  },
  {
    name: 'Medium Commercial Vehicle (MCV - 17 to 20 ft)',
    code: 'MCV',
    description: 'Regional bulk cargo and industrial equipment transport (e.g. Eicher Pro 3015, Tata 1109, BharatBenz 1217C)',
    vehicleType: 'mcv',
    payloadRange: {
      minKg: 6000,
      maxKg: 10000,
    },
    cargoDimensions: {
      lengthFt: 19.0,
      widthFt: 7.5,
      heightFt: 7.0,
      cargoVolumeCuFt: 997,
    },
    supportedBodyTypes: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'FLATBED'],
    isActive: true,
  },
  {
    name: 'Heavy Commercial Vehicle (HCV - 22 to 32 ft / Multi-Axle)',
    code: 'HCV',
    description: 'Long-haul national interstate heavy freight and container trailer (e.g. Tata Signa, Ashok Leyland 2820, Eicher Pro 6028)',
    vehicleType: 'hcv',
    payloadRange: {
      minKg: 14000,
      maxKg: 30000,
    },
    cargoDimensions: {
      lengthFt: 28.0,
      widthFt: 8.0,
      heightFt: 8.5,
      cargoVolumeCuFt: 1904,
    },
    supportedBodyTypes: ['CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'FLATBED', 'REFRIGERATED_CONTAINER'],
    isActive: true,
  },
];

module.exports = {
  DEFAULT_VEHICLE_CATEGORIES,
};
