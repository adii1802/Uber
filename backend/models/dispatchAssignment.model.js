const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Generate unique commercial assignment reference
 * Format: CRA-YYYYMMDD-XXXXX
 */
const generateAssignmentReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `CRA-${dateStr}-${randomSuffix}`;
};

const dispatchAssignmentSchema = new mongoose.Schema(
  {
    assignmentReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      default: generateAssignmentReference,
    },
    dispatchJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DispatchJob',
      required: [true, 'Dispatch job reference is required'],
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CargoBooking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    shipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: [true, 'Shipment consignment reference is required'],
      unique: true, // Guarantees at database level that one shipment has at most 1 assignment
      index: true,
    },
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Captain',
      required: [true, 'Assigned transporter reference is required'],
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Assigned vehicle reference is required'],
      index: true,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DispatchOffer',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    assignmentStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED'],
      default: 'ACTIVE',
      index: true,
    },
    assignmentSource: {
      type: String,
      enum: ['TRANSPORTER_ACCEPTED_OFFER', 'MANUAL_ADMIN_OVERRIDE'],
      default: 'TRANSPORTER_ACCEPTED_OFFER',
    },
    auditMetadata: {
      acceptedOfferId: { type: mongoose.Schema.Types.ObjectId },
      assignmentTimestamp: { type: Date, default: Date.now },
      clientIp: { type: String, default: '' },
      userAgent: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// Indexes
dispatchAssignmentSchema.index({ transporter: 1, assignmentStatus: 1 });
dispatchAssignmentSchema.index({ vehicle: 1, assignmentStatus: 1 });
dispatchAssignmentSchema.index({ createdAt: -1 });

dispatchAssignmentSchema.statics.generateAssignmentReference = generateAssignmentReference;

const DispatchAssignment = mongoose.model('DispatchAssignment', dispatchAssignmentSchema);
module.exports = DispatchAssignment;
