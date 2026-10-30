const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ROLES = require('../constants/roles');

const userSchema = new mongoose.Schema(
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
      minlength: [5, 'email must be at least 5 characters long'],
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
      enum: [ROLES.CUSTOMER],
      default: ROLES.CUSTOMER,
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
  },
  { timestamps: true }
);

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      id: this._id,
      email: this.email,
      role: this.role || ROLES.CUSTOMER,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  return token;
};

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const userModel = mongoose.model('User', userSchema);
module.exports = userModel;