const mongoose = require('mongoose');
const crypto = require('crypto');
const locationSchema = require('./schemas/location.schema');

/**
 * Generate unique commercial dispatch offer reference
 * Format: CRO-YYYYMMDD-XXXXX
 */
const generateOfferReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CRO-${dateStr}-${randomSuffix}`;
};

const dispatchOfferSchema = new mongoose.Schema(
  {
    offerReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      default: generateOfferReference,
    },
    dispatchJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DispatchJob',
      required: [true, 'Dispatch job reference is required'],
      index: true,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: [true, 'Shipment consignment reference is required'],
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CargoBooking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      required: [true, 'Target transporter account reference is required'],
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Target vehicle reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'],
      default: 'PENDING',
      index: true,
    },
    offeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Offer expiration timestamp is required'],
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    acceptanceMetadata: {
      acceptedAt: { type: Date },
      ipAddress: { type: String, default: '' },
      userAgent: { type: String, default: '' },
    },
    cargoSnapshot: {
      name: { type: String, required: true },
      category: { type: String, required: true },
      weightKg: { type: Number, required: true },
      packageCount: { type: Number, required: true },
      packagingType: { type: String, required: true },
      isFragile: { type: Boolean, default: false },
      handlingInstructions: { type: String, default: '' },
      dimensions: {
        lengthFt: Number,
        widthFt: Number,
        heightFt: Number,
        volumeCuFt: Number,
      },
    },
    pickupSnapshot: {
      type: locationSchema,
      required: true,
    },
    dropoffSnapshot: {
      type: locationSchema,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
// 1. Efficient lookup of pending offers for a specific transporter
dispatchOfferSchema.index({ transporter: 1, status: 1, expiresAt: 1 });
// 2. Prevent duplicate active or pending offers for the same dispatch job and vehicle
dispatchOfferSchema.index({ dispatchJob: 1, vehicle: 1, status: 1 });
// 3. Expiration job sweep index
dispatchOfferSchema.index({ expiresAt: 1, status: 1 });

dispatchOfferSchema.statics.generateOfferReference = generateOfferReference;

const DispatchOffer = mongoose.model('DispatchOffer', dispatchOfferSchema);
module.exports = DispatchOffer;
