const mongoose = require('mongoose');

/**
 * Normalize Indian commercial vehicle registration numbers.
 * Examples: "dl 01 ab 1234" -> "DL-01-AB-1234", "MH-12-DE-9876" -> "MH-12-DE-9876"
 */
const normalizeRegistrationNumber = (regNum) => {
  if (!regNum || typeof regNum !== 'string') return '';
  const clean = regNum.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Match standard Indian format: 2 letters (state) + 1-2 digits (RTO) + 1-3 letters (series) + 4 digits
  const match = clean.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
  if (match) {
    const [, state, rto, series, number] = match;
    const paddedRto = rto.length === 1 ? `0${rto}` : rto;
    return `${state}-${paddedRto}-${series}-${number}`;
  }
  // Fallback: Return cleanly trimmed uppercase
  return regNum.trim().toUpperCase().replace(/\s+/g, '-');
};

const vehicleSchema = new mongoose.Schema(
  {
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      required: [true, 'Transporter account reference is required'],
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleCategory',
      required: [true, 'Vehicle category reference is required'],
      index: true,
    },
    categoryCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    manufacturer: {
      type: String,
      required: [true, 'Vehicle manufacturer is required (e.g. Tata Motors, Mahindra)'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model name is required (e.g. Ace Gold, Bolero Pickup)'],
      trim: true,
    },
    manufacturingYear: {
      type: Number,
      required: [true, 'Manufacturing year is required'],
      min: [1995, 'Manufacturing year cannot be older than 1995'],
      max: [new Date().getFullYear() + 1, 'Manufacturing year cannot be in the future'],
    },
    payloadCapacityKg: {
      type: Number,
      required: [true, 'Payload capacity in kilograms is required'],
      min: [50, 'Minimum payload capacity is 50 kg'],
    },
    cargoBodyDimensions: {
      lengthFt: {
        type: Number,
        required: [true, 'Cargo bed length in feet is required'],
        min: [1, 'Length must be at least 1 foot'],
      },
      widthFt: {
        type: Number,
        required: [true, 'Cargo bed width in feet is required'],
        min: [1, 'Width must be at least 1 foot'],
      },
      heightFt: {
        type: Number,
        required: [true, 'Cargo bed height in feet is required'],
        min: [1, 'Height must be at least 1 foot'],
      },
      cargoVolumeCuFt: {
        type: Number,
        default: 0,
      },
      bodyType: {
        type: String,
        enum: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'REFRIGERATED_CONTAINER', 'FLATBED'],
        default: 'CLOSED_CONTAINER',
      },
    },
    documentReferences: {
      rcNumber: {
        type: String,
        trim: true,
        default: '',
      },
      insuranceNumber: {
        type: String,
        trim: true,
        default: '',
      },
      insuranceExpiry: {
        type: Date,
      },
      fitnessCertExpiry: {
        type: Date,
      },
      permitType: {
        type: String,
        enum: ['STATE_PERMIT', 'NATIONAL_PERMIT'],
        default: 'STATE_PERMIT',
      },
      permitExpiry: {
        type: Date,
      },
      vehiclePhotos: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    verificationDetails: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
      },
      reviewedAt: {
        type: Date,
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: '',
      },
      notes: {
        type: String,
        trim: true,
        default: '',
      },
    },
    availabilityStatus: {
      type: String,
      enum: ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'UNAVAILABLE'],
      default: 'AVAILABLE',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Pre-save hook: Normalize registration number and calculate volume
vehicleSchema.pre('save', function (next) {
  if (this.isModified('registrationNumber')) {
    this.registrationNumber = normalizeRegistrationNumber(this.registrationNumber);
  }

  if (
    this.cargoBodyDimensions &&
    this.cargoBodyDimensions.lengthFt &&
    this.cargoBodyDimensions.widthFt &&
    this.cargoBodyDimensions.heightFt
  ) {
    this.cargoBodyDimensions.cargoVolumeCuFt = Math.round(
      this.cargoBodyDimensions.lengthFt *
        this.cargoBodyDimensions.widthFt *
        this.cargoBodyDimensions.heightFt
    );
  }

  next();
});

// Compound index for transporter vehicles listing
vehicleSchema.index({ transporter: 1, isActive: 1 });

vehicleSchema.statics.normalizeRegistrationNumber = normalizeRegistrationNumber;

const vehicleModel = mongoose.model('Vehicle', vehicleSchema);
module.exports = vehicleModel;
