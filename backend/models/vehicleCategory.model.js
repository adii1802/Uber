const mongoose = require('mongoose');
const { DEFAULT_VEHICLE_CATEGORIES } = require('../config/vehicleCategories.config');

const vehicleCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Category unique code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Category description is required'],
      trim: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type classification is required'],
      trim: true,
      lowercase: true,
    },
    payloadRange: {
      minKg: {
        type: Number,
        required: [true, 'Minimum payload capacity is required'],
        min: 0,
      },
      maxKg: {
        type: Number,
        required: [true, 'Maximum payload capacity is required'],
        min: 1,
      },
    },
    cargoDimensions: {
      lengthFt: { type: Number, default: 0 },
      widthFt: { type: Number, default: 0 },
      heightFt: { type: Number, default: 0 },
      cargoVolumeCuFt: { type: Number, default: 0 },
    },
    supportedBodyTypes: [
      {
        type: String,
        enum: ['OPEN_BED', 'CLOSED_CONTAINER', 'TARPAULIN_COVERED', 'REFRIGERATED_CONTAINER', 'FLATBED'],
        default: 'CLOSED_CONTAINER',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * Seed standard default vehicle categories if none exist in the database
 */
vehicleCategorySchema.statics.seedDefaultCategories = async function () {
  const count = await this.countDocuments();
  if (count === 0) {
    await this.insertMany(DEFAULT_VEHICLE_CATEGORIES);
  }
};

const VehicleCategory = mongoose.model('VehicleCategory', vehicleCategorySchema);
module.exports = VehicleCategory;
