const mongoose = require('mongoose');
const crypto = require('crypto');
const locationSchema = require('./schemas/location.schema');

/**
 * Generate unique commercial cargo booking reference
 * Format: CRB-YYYYMMDD-XXXXX
 */
const generateBookingReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CRB-${dateStr}-${randomSuffix}`;
};

const cargoBookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      default: generateBookingReference,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer account reference is required'],
      index: true,
    },
    pickup: {
      type: locationSchema,
      required: [true, 'Pickup location details are required'],
    },
    dropoff: {
      type: locationSchema,
      required: [true, 'Dropoff location details are required'],
    },
    cargo: {
      name: {
        type: String,
        required: [true, 'Cargo description/name is required'],
        trim: true,
        maxlength: [100, 'Cargo name cannot exceed 100 characters'],
      },
      category: {
        type: String,
        enum: [
          'GENERAL_CARGO',
          'INDUSTRIAL_GOODS',
          'AUTOMOTIVE_PARTS',
          'BUILDING_MATERIALS',
          'FMCG_PACKAGED_GOODS',
          'PERISHABLES_AGRICULTURAL',
          'ELECTRONICS_HARDWARE',
          'TEXTILES_GARMENTS',
          'FURNITURE_FIXTURES',
          'OTHER',
        ],
        default: 'GENERAL_CARGO',
        required: true,
      },
      weightKg: {
        type: Number,
        required: [true, 'Total cargo weight in kilograms is required'],
        min: [1, 'Cargo weight must be at least 1 kg'],
        max: [40000, 'Single commercial booking weight cannot exceed 40,000 kg'],
      },
      dimensions: {
        lengthFt: { type: Number, min: 0, default: 0 },
        widthFt: { type: Number, min: 0, default: 0 },
        heightFt: { type: Number, min: 0, default: 0 },
        volumeCuFt: { type: Number, min: 0, default: 0 },
      },
      packageCount: {
        type: Number,
        required: [true, 'Total package count is required'],
        min: [1, 'Package count must be at least 1'],
        default: 1,
      },
      packagingType: {
        type: String,
        enum: [
          'BOXES_CARTONS',
          'WOODEN_CRATES',
          'PALLETIZED',
          'GUNNY_BAGS',
          'DRUMS_BARRELS',
          'LOOSE_OPEN',
          'ROLLS',
          'CONTAINERIZED',
        ],
        default: 'BOXES_CARTONS',
      },
      isFragile: {
        type: Boolean,
        default: false,
      },
      handlingInstructions: {
        type: String,
        trim: true,
        default: '',
        maxlength: [300, 'Handling instructions cannot exceed 300 characters'],
      },
    },
    requestedVehicleCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleCategory',
      required: [true, 'Preferred vehicle category is required'],
      index: true,
    },
    categoryCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    requestedPickupAt: {
      type: Date,
      required: [true, 'Requested pickup date and time is required'],
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Special instructions cannot exceed 500 characters'],
    },
    bookingStatus: {
      type: String,
      enum: ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'REQUESTED',
      index: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    cancellationParty: {
      type: String,
      enum: ['CUSTOMER', 'ADMIN', 'SYSTEM'],
      default: null,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook: auto-calculate cargo volume if dimensions provided
cargoBookingSchema.pre('save', function (next) {
  if (
    this.cargo &&
    this.cargo.dimensions &&
    this.cargo.dimensions.lengthFt &&
    this.cargo.dimensions.widthFt &&
    this.cargo.dimensions.heightFt
  ) {
    this.cargo.dimensions.volumeCuFt = Math.round(
      this.cargo.dimensions.lengthFt * this.cargo.dimensions.widthFt * this.cargo.dimensions.heightFt
    );
  }
  next();
});

// Indexes for query performance
cargoBookingSchema.index({ customer: 1, createdAt: -1 });
cargoBookingSchema.index({ bookingStatus: 1, requestedPickupAt: 1 });

cargoBookingSchema.statics.generateBookingReference = generateBookingReference;

const CargoBooking = mongoose.model('CargoBooking', cargoBookingSchema);
module.exports = CargoBooking;
