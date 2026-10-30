const mongoose = require('mongoose');
const crypto = require('crypto');
const locationSchema = require('./schemas/location.schema');

/**
 * Generate unique commercial shipment reference
 * Format: CRS-YYYYMMDD-XXXXX
 */
const generateShipmentReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CRS-${dateStr}-${randomSuffix}`;
};

const shipmentSchema = new mongoose.Schema(
  {
    shipmentReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      default: generateShipmentReference,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CargoBooking',
      required: [true, 'Associated cargo booking reference is required'],
      unique: true, // Guarantees exactly 1 shipment per booking at database level
      index: true,
    },
    bookingReference: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer account reference is required'],
      index: true,
    },
    pickup: {
      type: locationSchema,
      required: true,
    },
    dropoff: {
      type: locationSchema,
      required: true,
    },
    cargo: {
      name: { type: String, required: true },
      category: { type: String, required: true },
      weightKg: { type: Number, required: true },
      dimensions: {
        lengthFt: Number,
        widthFt: Number,
        heightFt: Number,
        volumeCuFt: Number,
      },
      packageCount: { type: Number, required: true },
      packagingType: { type: String, required: true },
      isFragile: { type: Boolean, default: false },
      handlingInstructions: { type: String, default: '' },
    },
    allocatedVehicleCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleCategory',
      required: true,
    },
    shipmentStatus: {
      type: String,
      enum: ['CREATED', 'MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'],
      default: 'CREATED',
      index: true,
    },
    timeline: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
shipmentSchema.index({ customer: 1, createdAt: -1 });

shipmentSchema.statics.generateShipmentReference = generateShipmentReference;

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
