const mongoose = require('mongoose');

/**
 * Reusable Structured Location Schema for CargoRide.
 * Designed to capture pickup and dropoff points with commercial contact details.
 */
const locationSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      required: [true, 'Address line is required'],
      trim: true,
      maxlength: [200, 'Address line cannot exceed 200 characters'],
    },
    locality: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [80, 'City cannot exceed 80 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [80, 'State cannot exceed 80 characters'],
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code (PIN code) is required'],
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'Invalid Indian 6-digit postal code (PIN code)'],
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90 degrees'],
        max: [90, 'Latitude must be between -90 and 90 degrees'],
        default: null,
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180 degrees'],
        max: [180, 'Longitude must be between -180 and 180 degrees'],
        default: null,
      },
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
      minlength: [2, 'Contact person name must be at least 2 characters long'],
      maxlength: [80, 'Contact person name cannot exceed 80 characters'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      match: [/^[6-9][0-9]{9}$/, 'Contact phone must be a valid 10-digit Indian mobile number'],
    },
  },
  { _id: false }
);

module.exports = locationSchema;
