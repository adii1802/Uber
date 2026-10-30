const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const vehicleController = require('../controllers/vehicle.controller');
const { requireTransporter, authenticateToken } = require('../middlewares/auth.middleware');

/**
 * PUBLIC / AUTHENTICATED: Query available vehicle categories
 */
router.get('/categories', vehicleController.getCategories);

/**
 * TRANSPORTER FLEET MANAGEMENT ROUTES
 */

// 1. Add new commercial vehicle
router.post(
  '/',
  [
    ...requireTransporter,
    body('registrationNumber')
      .trim()
      .notEmpty()
      .withMessage('Registration number is required')
      .isLength({ min: 6, max: 20 })
      .withMessage('Registration number must be between 6 and 20 characters'),
    body('category')
      .notEmpty()
      .withMessage('Vehicle category ID or code is required'),
    body('manufacturer')
      .trim()
      .notEmpty()
      .withMessage('Vehicle manufacturer is required'),
    body('model')
      .trim()
      .notEmpty()
      .withMessage('Vehicle model is required'),
    body('manufacturingYear')
      .isInt({ min: 1995, max: new Date().getFullYear() + 1 })
      .withMessage(`Manufacturing year must be between 1995 and ${new Date().getFullYear() + 1}`),
    body('payloadCapacityKg')
      .isFloat({ min: 50 })
      .withMessage('Payload capacity must be at least 50 kg'),
    body('cargoBodyDimensions.lengthFt')
      .isFloat({ min: 1 })
      .withMessage('Cargo bed length must be at least 1 foot'),
    body('cargoBodyDimensions.widthFt')
      .isFloat({ min: 1 })
      .withMessage('Cargo bed width must be at least 1 foot'),
    body('cargoBodyDimensions.heightFt')
      .isFloat({ min: 1 })
      .withMessage('Cargo bed height must be at least 1 foot'),
  ],
  vehicleController.addVehicle
);

// 2. List authenticated transporter's vehicles
router.get('/', requireTransporter, vehicleController.getMyVehicles);

// 3. Get detailed vehicle information
router.get(
  '/:id',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid vehicle ID format')],
  vehicleController.getVehicleDetails
);

// 4. Update vehicle details
router.put(
  '/:id',
  [
    ...requireTransporter,
    param('id').isMongoId().withMessage('Invalid vehicle ID format'),
    body('manufacturingYear')
      .optional()
      .isInt({ min: 1995, max: new Date().getFullYear() + 1 })
      .withMessage('Invalid manufacturing year'),
    body('payloadCapacityKg')
      .optional()
      .isFloat({ min: 50 })
      .withMessage('Payload capacity must be at least 50 kg'),
  ],
  vehicleController.updateVehicle
);

// 5. Update vehicle availability status
router.patch(
  '/:id/availability',
  [
    ...requireTransporter,
    param('id').isMongoId().withMessage('Invalid vehicle ID format'),
    body('availabilityStatus')
      .isIn(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'UNAVAILABLE'])
      .withMessage('Availability status must be AVAILABLE, ON_TRIP, MAINTENANCE, or UNAVAILABLE'),
  ],
  vehicleController.updateAvailability
);

// 6. Deactivate vehicle (soft delete)
router.patch(
  '/:id/deactivate',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid vehicle ID format')],
  vehicleController.deactivateVehicle
);

// Alias: DELETE /:id
router.delete(
  '/:id',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid vehicle ID format')],
  vehicleController.deactivateVehicle
);

module.exports = router;
