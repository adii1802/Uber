const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ROLES = require('../constants/roles');

const captainSchema = new mongoose.Schema(
  {
    fullname: {
      firstname: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, 'firstname must be at least 3 characters long'],
      },
      lastname: {
        type: String,
        trim: true,
        default: '',
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'is invalid email'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: [ROLES.TRANSPORTER],
      default: ROLES.TRANSPORTER,
      immutable: true, // Prevents self-escalation
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['available', 'unavailable'],
      default: 'unavailable',
    },
    vehicle: {
      color: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, 'color must be at least 3 characters long'],
      },
      plate: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, 'plate must be at least 3 characters long'],
      },
      capacity: {
        type: Number,
        required: true,
        min: [1, 'capacity must be at least 1'],
      },
      vehicleType: {
        type: String,
        required: true,
        enum: ['car', 'motorcycle', 'auto', 'mini-truck', 'pickup'],
      },
    },
    location: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
  },
  { timestamps: true }
);

captainSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      id: this._id,
      email: this.email,
      role: this.role || ROLES.TRANSPORTER,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
};

captainSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

captainSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const captainModel = mongoose.model('Captain', captainSchema);
module.exports = captainModel;
