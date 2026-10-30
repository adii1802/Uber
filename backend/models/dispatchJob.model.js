const mongoose = require('mongoose');
const crypto = require('crypto');
const locationSchema = require('./schemas/location.schema');

/**
 * Generate unique commercial dispatch reference
 * Format: CRD-YYYYMMDD-XXXXX
 */
const generateDispatchReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CRD-${dateStr}-${randomSuffix}`;
};

const dispatchJobSchema = new mongoose.Schema(
  {
    dispatchReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      default: generateDispatchReference,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CargoBooking',
      required: [true, 'Associated cargo booking reference is required'],
      index: true,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: [true, 'Associated shipment consignment reference is required'],
      unique: true, // Guarantees exactly one active dispatch job per shipment
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'OFFERING', 'ASSIGNED', 'EXHAUSTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    requiredVehicleCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleCategory',
      required: [true, 'Required vehicle category reference is required'],
      index: true,
    },
    requiredPayloadKg: {
      type: Number,
      required: [true, 'Required cargo payload weight is required'],
    },
    requiredDimensions: {
      lengthFt: { type: Number, default: 0 },
      widthFt: { type: Number, default: 0 },
      heightFt: { type: Number, default: 0 },
      volumeCuFt: { type: Number, default: 0 },
    },
    cargoSnapshot: {
      name: { type: String, required: true },
      category: { type: String, required: true },
      weightKg: { type: Number, required: true },
      packageCount: { type: Number, required: true },
      packagingType: { type: String, required: true },
      isFragile: { type: Boolean, default: false },
      handlingInstructions: { type: String, default: '' },
    },
    pickupLocationSnapshot: {
      type: locationSchema,
      required: true,
    },
    deliveryLocationSnapshot: {
      type: locationSchema,
      required: true,
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    batchSize: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    offerExpirySeconds: {
      type: Number,
      default: 120, // 2 minutes default expiry
      min: 30,
      max: 1800,
    },
    assignedTransporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      default: null,
      index: true,
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'initiatedModel',
    },
    initiatedModel: {
      type: String,
      enum: ['Admin', 'User', 'System'],
      default: 'Admin',
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },
    exhaustionReason: {
      type: String,
      trim: true,
      default: '',
    },
    auditLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId },
        performedModel: { type: String, default: 'Admin' },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: Object, default: {} },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for high-performance operational lookups
dispatchJobSchema.index({ status: 1, createdAt: -1 });
dispatchJobSchema.index({ requiredVehicleCategory: 1, status: 1 });

dispatchJobSchema.statics.generateDispatchReference = generateDispatchReference;

const DispatchJob = mongoose.model('DispatchJob', dispatchJobSchema);
module.exports = DispatchJob;
