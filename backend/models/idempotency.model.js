const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      default: 201,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Automatic TTL expiration after 24 hours
    },
  },
  { timestamps: false }
);

// Enforce unique idempotency key per customer
idempotencyRecordSchema.index({ key: 1, customer: 1 }, { unique: true });

const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
module.exports = IdempotencyRecord;
