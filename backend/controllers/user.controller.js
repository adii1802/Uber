const { validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const authService = require('../services/auth.service');
const ROLES = require('../constants/roles');

/**
 * Register a new Customer
 */
module.exports.registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, phone } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userModel.create({
      fullname: {
        firstname: fullname.firstname.trim(),
        lastname: fullname.lastname ? fullname.lastname.trim() : '',
      },
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role: ROLES.CUSTOMER,
      isActive: true,
    });

    const token = user.generateAuthToken();

    res
      .status(201)
      .cookie('token', token, authService.getAuthCookieOptions())
      .json({
        user: {
          _id: user._id,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
        token,
      });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Customer Login
 */
module.exports.loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await userModel.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Forbidden: Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = user.generateAuthToken();

    res
      .status(200)
      .cookie('token', token, authService.getAuthCookieOptions())
      .json({
        user: {
          _id: user._id,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
        token,
      });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Customer Profile
 */
module.exports.getUserProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/**
 * Update Customer Profile
 */
module.exports.updateUserProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, phone } = req.body;
    const updateData = {};

    if (fullname) {
      updateData.fullname = {
        firstname: fullname.firstname
          ? fullname.firstname.trim()
          : req.user.fullname.firstname,
        lastname:
          fullname.lastname !== undefined
            ? fullname.lastname.trim()
            : req.user.fullname.lastname,
      };
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Current Session info
 */
module.exports.getCurrentSession = async (req, res) => {
  res.status(200).json({
    user: req.user,
    role: req.auth.role,
  });
};

/**
 * Customer Logout & Token Revocation
 */
module.exports.logoutUser = async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ') &&
        req.headers.authorization.split(' ')[1]);

    if (token) {
      await authService.revokeToken(token);
    }

    res.clearCookie('token', { path: '/' });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
