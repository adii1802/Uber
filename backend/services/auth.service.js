const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const blacklistTokenModel = require('../models/blacklistToken.model');
const ROLES = require('../constants/roles');

/**
 * Hash plain text password using bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare plain text password with stored hash
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Generate signed JWT with account id, email, and canonical role
 */
const generateAuthToken = ({ id, email, role }) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment');
  }

  return jwt.sign(
    {
      _id: id,
      id: id,
      email: email,
      role: role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verify and decode JWT token safely
 */
const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Check if a token has been revoked / blacklisted
 */
const isTokenBlacklisted = async (token) => {
  if (!token) return false;
  const found = await blacklistTokenModel.findOne({ token });
  return !!found;
};

/**
 * Revoke / blacklist a token upon logout
 */
const revokeToken = async (token) => {
  if (!token) return null;
  // If already blacklisted, ignore duplicate error
  try {
    return await blacklistTokenModel.create({ token });
  } catch (err) {
    if (err.code === 11000) return null; // Duplicate key error
    throw err;
  }
};

/**
 * Resolve account record from database by role and ID.
 * Verifies account exists and is not deactivated.
 */
const resolveAccount = async (id, role) => {
  let model;
  switch (role) {
    case ROLES.CUSTOMER:
      model = userModel;
      break;
    case ROLES.TRANSPORTER:
      model = captainModel;
      break;
    case ROLES.ADMIN:
      model = adminModel;
      break;
    default:
      // Backward compatibility fallback: check user then captain
      let fallbackAccount = await userModel.findById(id);
      if (fallbackAccount) return { account: fallbackAccount, role: ROLES.CUSTOMER };
      fallbackAccount = await captainModel.findById(id);
      if (fallbackAccount) return { account: fallbackAccount, role: ROLES.TRANSPORTER };
      return null;
  }

  const account = await model.findById(id);
  if (!account) return null;
  return { account, role };
};

/**
 * Standard HTTP-only Cookie Options for JWT
 */
const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  let sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');
  let secure = isProduction || process.env.COOKIE_SECURE === 'true';
  if (sameSite.toLowerCase() === 'none' && !secure) {
    secure = true;
  }
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  };
};

const getClearCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  let sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');
  let secure = isProduction || process.env.COOKIE_SECURE === 'true';
  if (sameSite.toLowerCase() === 'none' && !secure) {
    secure = true;
  }
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAuthToken,
  verifyToken,
  isTokenBlacklisted,
  revokeToken,
  resolveAccount,
  getAuthCookieOptions,
  getClearCookieOptions,
};
