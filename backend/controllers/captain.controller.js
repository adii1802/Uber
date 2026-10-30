const { validationResult } = require('express-validator');
const captainModel = require('../models/captain.model');
const authService = require('../services/auth.service');
const ROLES = require('../constants/roles');

/**
 * Register a new Transporter (Captain)
 */
module.exports.registerCaptain = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, email, password, vehicle, phone } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const isCaptainAlreadyExist = await captainModel.findOne({ email: normalizedEmail });
    if (isCaptainAlreadyExist) {
      return res.status(409).json({
        message: 'Captain with this email already exists',
        error: 'Captain with this email already exists',
      });
    }

    // Normalize vehicle type if legacy frontend sent 'moto'
    let vehicleType = vehicle.vehicleType;
    if (vehicleType === 'moto') {
      vehicleType = 'motorcycle';
    }

    const hashedPassword = await captainModel.hashPassword(password);

    const captain = await captainModel.create({
      fullname: {
        firstname: fullname.firstname.trim(),
        lastname: fullname.lastname ? fullname.lastname.trim() : '',
      },
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      password: hashedPassword,
      role: ROLES.TRANSPORTER,
      isActive: true,
      vehicle: {
        color: vehicle.color.trim(),
        plate: vehicle.plate.trim(),
        capacity: Number(vehicle.capacity),
        vehicleType,
      },
    });

    const token = captain.generateAuthToken();

    const captainResponse = {
      _id: captain._id,
      fullname: captain.fullname,
      email: captain.email,
      phone: captain.phone,
      role: captain.role,
      isActive: captain.isActive,
      vehicle: captain.vehicle,
      status: captain.status,
    };

    res
      .status(201)
      .cookie('token', token, authService.getAuthCookieOptions())
      .json({
        captain: captainResponse,
        token,
      });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Transporter Login
 */
module.exports.loginCaptain = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const captain = await captainModel.findOne({ email: normalizedEmail }).select('+password');
    if (!captain) {
      return res.status(401).json({
        message: 'Invalid email or password',
        error: 'Invalid email or password',
      });
    }

    if (captain.isActive === false) {
      return res.status(403).json({ message: 'Forbidden: Account is deactivated' });
    }

    const isMatch = await captain.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
        error: 'Invalid email or password',
      });
    }

    const token = captain.generateAuthToken();

    const captainResponse = {
      _id: captain._id,
      fullname: captain.fullname,
      email: captain.email,
      phone: captain.phone,
      role: captain.role,
      isActive: captain.isActive,
      vehicle: captain.vehicle,
      status: captain.status,
    };

    res
      .status(200)
      .cookie('token', token, authService.getAuthCookieOptions())
      .json({
        captain: captainResponse,
        token,
      });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Transporter Profile
 * Returns both direct captain object and captain nested property for 100% frontend compatibility.
 */
module.exports.getCaptainProfile = async (req, res) => {
  const captainObj = req.captain.toObject ? req.captain.toObject() : req.captain;
  // Ensure both response.data.captain and response.data work seamlessly
  res.status(200).json({
    ...captainObj,
    captain: captainObj,
  });
};

/**
 * Update Transporter Profile
 */
module.exports.updateCaptainProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullname, phone, vehicle } = req.body;
    const updateData = {};

    if (fullname) {
      updateData.fullname = {
        firstname: fullname.firstname
          ? fullname.firstname.trim()
          : req.captain.fullname.firstname,
        lastname:
          fullname.lastname !== undefined
            ? fullname.lastname.trim()
            : req.captain.fullname.lastname,
      };
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim();
    }

    if (vehicle) {
      updateData.vehicle = {
        color: vehicle.color ? vehicle.color.trim() : req.captain.vehicle.color,
        plate: vehicle.plate ? vehicle.plate.trim() : req.captain.vehicle.plate,
        capacity: vehicle.capacity ? Number(vehicle.capacity) : req.captain.vehicle.capacity,
        vehicleType: vehicle.vehicleType || req.captain.vehicle.vehicleType,
      };
    }

    const updatedCaptain = await captainModel.findByIdAndUpdate(
      req.captain._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      captain: updatedCaptain,
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
    captain: req.captain,
    role: req.auth.role,
  });
};

/**
 * Transporter Logout & Token Revocation
 */
module.exports.logoutCaptain = async (req, res) => {
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
