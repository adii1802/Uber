const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const captainController = require('../controllers/captain.controller');
const { requireTransporter, authorizeResourceOwner } = require('../middlewares/auth.middleware');

/**
 * TRANSPORTER (CAPTAIN) REGISTRATION
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('fullname.firstname')
      .isLength({ min: 3 })
      .withMessage('Firstname must be at least 3 characters long'),
    body('fullname.lastname')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Lastname must be at least 3 characters long'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('vehicle.color')
      .isLength({ min: 3 })
      .withMessage('Color must be at least 3 characters long'),
    body('vehicle.plate')
      .isLength({ min: 3 })
      .withMessage('Plate must be at least 3 characters long'),
    body('vehicle.capacity')
      .isInt({ min: 1 })
      .withMessage('Capacity must be at least 1'),
    body('vehicle.vehicleType')
      .isIn(['car', 'motorcycle', 'auto', 'moto', 'mini-truck', 'pickup'])
      .withMessage('Invalid vehicle type'),
    body('phone')
      .optional()
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 digits'),
  ],
  captainController.registerCaptain
);

/**
 * TRANSPORTER (CAPTAIN) LOGIN
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  captainController.loginCaptain
);

/**
 * PROTECTED TRANSPORTER ROUTES
 */
router.get('/profile', requireTransporter, captainController.getCaptainProfile);
router.put(
  '/profile',
  [
    requireTransporter,
    body('fullname.firstname')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Firstname must be at least 3 characters long'),
    body('fullname.lastname')
      .optional()
      .isLength({ min: 3 })
      .withMessage('Lastname must be at least 3 characters long'),
    body('phone')
      .optional()
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 digits'),
  ],
  captainController.updateCaptainProfile
);
router.get('/me', requireTransporter, captainController.getCurrentSession);
router.get('/logout', requireTransporter, captainController.logoutCaptain);

/**
 * OBJECT-LEVEL AUTHORIZATION ROUTE (e.g., accessing own vehicle telemetry/data)
 */
router.get(
  '/:id/data',
  requireTransporter,
  authorizeResourceOwner(),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted to private transporter resource',
      transporterId: req.params.id,
    });
  }
);

module.exports = router;