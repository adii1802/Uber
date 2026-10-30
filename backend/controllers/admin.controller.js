const { validationResult } = require('express-validator');
const adminModel = require('../models/admin.model');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const authService = require('../services/auth.service');
const ROLES = require('../constants/roles');


/**
 * Admin Login
 */
module.exports.loginAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const admin = await adminModel.findOne({ email: normalizedEmail }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid administrative credentials' });
    }

    if (admin.isActive === false) {
      return res.status(403).json({ message: 'Forbidden: Administrator account is deactivated' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid administrative credentials' });
    }

    const token = admin.generateAuthToken();

    res
      .status(200)
      .cookie('token', token, authService.getAuthCookieOptions())
      .json({
        admin: {
          _id: admin._id,
          fullname: admin.fullname,
          email: admin.email,
          role: admin.role,
          isSuperAdmin: admin.isSuperAdmin,
          isActive: admin.isActive,
        },
      });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create Secondary Admin (requires authenticated Super Admin)
 */
module.exports.createSecondaryAdmin = async (req, res) => {
  try {
    if (!req.user.isSuperAdmin) {
      return res.status(403).json({
        message: 'Forbidden: Only Super Administrators can provision additional administrators',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstname, lastname, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await adminModel.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Administrator with this email already exists' });
    }

    const hashedPassword = await adminModel.hashPassword(password);

    const newAdmin = await adminModel.create({
      fullname: {
        firstname: firstname.trim(),
        lastname: lastname ? lastname.trim() : '',
      },
      email: normalizedEmail,
      password: hashedPassword,
      role: ROLES.ADMIN,
      isSuperAdmin: false,
      isActive: true,
    });

    res.status(201).json({
      message: 'Secondary administrator created successfully',
      admin: {
        _id: newAdmin._id,
        fullname: newAdmin.fullname,
        email: newAdmin.email,
        role: newAdmin.role,
        isSuperAdmin: newAdmin.isSuperAdmin,
        isActive: newAdmin.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Admin Profile
 */
module.exports.getAdminProfile = async (req, res) => {
  res.status(200).json(req.user);
};

/**
 * Admin Dashboard System Overview
 */
module.exports.getDashboardStats = async (req, res) => {
  try {
    const totalCustomers = await userModel.countDocuments();
    const totalTransporters = await captainModel.countDocuments();
    const totalAdmins = await adminModel.countDocuments();

    res.status(200).json({
      platform: 'CargoRide',
      statistics: {
        totalCustomers,
        totalTransporters,
        totalAdmins,
      },
      operator: req.user.fullname,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve administrative statistics' });
  }
};

/**
 * Toggle Account Active Status (Suspend / Reactivate User or Transporter)
 */
module.exports.toggleAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountType, isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive boolean is required' });
    }

    const targetModel = accountType === 'transporter' ? captainModel : userModel;
    const updatedAccount = await targetModel.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    );

    if (!updatedAccount) {
      return res.status(404).json({ message: 'Target account not found' });
    }

    res.status(200).json({
      message: `Account status updated to ${isActive ? 'active' : 'suspended'}`,
      account: {
        _id: updatedAccount._id,
        email: updatedAccount.email,
        isActive: updatedAccount.isActive,
        role: updatedAccount.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Admin Logout
 */
module.exports.logoutAdmin = async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (token) {
      await authService.revokeToken(token);
    }

    res.clearCookie('token', authService.getClearCookieOptions());
    res.status(200).json({ message: 'Administrator logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
