const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const bookingController = require('../controllers/booking.controller');
const { requireCustomer } = require('../middlewares/auth.middleware');

/**
 * CUSTOMER CARGO BOOKING ROUTES
 */

// 1. Create a commercial cargo booking request
router.post(
  '/',
  [
    ...requireCustomer,
    // Pickup Location Validation
    body('pickup.addressLine').trim().notEmpty().withMessage('Pickup address line is required'),
    body('pickup.city').trim().notEmpty().withMessage('Pickup city is required'),
    body('pickup.state').trim().notEmpty().withMessage('Pickup state is required'),
    body('pickup.postalCode')
      .trim()
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Valid 6-digit Indian pickup PIN code is required'),
    body('pickup.contactPerson')
      .trim()
      .notEmpty()
      .withMessage('Pickup contact person name is required'),
    body('pickup.contactPhone')
      .trim()
      .matches(/^[6-9][0-9]{9}$/)
      .withMessage('Pickup contact phone must be a valid 10-digit Indian mobile number'),
    body('pickup.coordinates.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Pickup latitude must be between -90 and 90 degrees'),
    body('pickup.coordinates.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Pickup longitude must be between -180 and 180 degrees'),

    // Dropoff Location Validation
    body('dropoff.addressLine').trim().notEmpty().withMessage('Dropoff address line is required'),
    body('dropoff.city').trim().notEmpty().withMessage('Dropoff city is required'),
    body('dropoff.state').trim().notEmpty().withMessage('Dropoff state is required'),
    body('dropoff.postalCode')
      .trim()
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Valid 6-digit Indian dropoff PIN code is required'),
    body('dropoff.contactPerson')
      .trim()
      .notEmpty()
      .withMessage('Dropoff contact person name is required'),
    body('dropoff.contactPhone')
      .trim()
      .matches(/^[6-9][0-9]{9}$/)
      .withMessage('Dropoff contact phone must be a valid 10-digit Indian mobile number'),
    body('dropoff.coordinates.latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Dropoff latitude must be between -90 and 90 degrees'),
    body('dropoff.coordinates.longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Dropoff longitude must be between -180 and 180 degrees'),

    // Cargo Specifications Validation
    body('cargo.name').trim().notEmpty().withMessage('Cargo description/name is required'),
    body('cargo.weightKg')
      .isFloat({ min: 1, max: 40000 })
      .withMessage('Cargo weight must be between 1 and 40,000 kilograms'),
    body('cargo.packageCount')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Package count must be at least 1'),

    // Category & Schedule Validation
    body('requestedVehicleCategory')
      .notEmpty()
      .withMessage('Preferred vehicle category is required'),
    body('requestedPickupAt')
      .notEmpty()
      .withMessage('Requested pickup date and time is required')
      .isISO8601()
      .withMessage('Requested pickup timestamp must be a valid ISO 8601 format'),
  ],
  bookingController.createBooking
);

// 2. List authenticated customer's cargo bookings
router.get('/', requireCustomer, bookingController.getMyBookings);

// 3. Retrieve specific booking details
router.get(
  '/:id',
  [...requireCustomer, param('id').isMongoId().withMessage('Invalid booking ID format')],
  bookingController.getBookingDetails
);

// 4. Cancel eligible booking
router.patch(
  '/:id/cancel',
  [
    ...requireCustomer,
    param('id').isMongoId().withMessage('Invalid booking ID format'),
    body('cancellationReason').optional().trim(),
  ],
  bookingController.cancelBooking
);

module.exports = router;
