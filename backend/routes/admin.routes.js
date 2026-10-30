const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');


const vehicleController = require('../controllers/vehicle.controller');
const bookingController = require('../controllers/booking.controller');
const shipmentController = require('../controllers/shipment.controller');

/**
 * ADMIN LOGIN
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid administrative email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  adminController.loginAdmin
);

/**
 * PROTECTED ADMIN ROUTES (REQUIRE ADMIN ROLE)
 */
router.get('/profile', requireAdmin, adminController.getAdminProfile);
router.get('/dashboard', requireAdmin, adminController.getDashboardStats);
router.post(
  '/create-admin',
  [
    requireAdmin,
    body('email').isEmail().withMessage('Invalid administrative email address'),
    body('fullname.firstname').isLength({ min: 3 }).withMessage('Firstname must be at least 3 characters long'),
    body('password').isLength({ min: 8 }).withMessage('Admin password must be at least 8 characters long'),
  ],
  adminController.createSecondaryAdmin
);
router.patch('/accounts/:id/status', requireAdmin, adminController.toggleAccountStatus);
router.get('/logout', requireAdmin, adminController.logoutAdmin);

/**
 * COMMERCIAL FLEET VERIFICATION & ADMINISTRATION
 */
router.get('/vehicles', requireAdmin, vehicleController.listAdminVehicles);
router.get('/vehicles/:id', requireAdmin, vehicleController.getAdminVehicleDetails);
router.patch(
  '/vehicles/:id/verify',
  [
    requireAdmin,
    body('decision').isIn(['APPROVED', 'REJECTED']).withMessage('Decision must be APPROVED or REJECTED'),
  ],
  vehicleController.verifyVehicle
);

/**
 * CARGO BOOKINGS & SHIPMENT ADMINISTRATION
 */
router.get('/bookings', requireAdmin, bookingController.listAdminBookings);
router.get('/bookings/:id', requireAdmin, bookingController.getBookingDetails);
router.patch(
  '/bookings/:id/status',
  [
    requireAdmin,
    body('status').isIn(['CONFIRMED', 'CANCELLED']).withMessage('Status must be CONFIRMED or CANCELLED'),
  ],
  bookingController.updateBookingStatus
);
router.get('/shipments', requireAdmin, shipmentController.listAdminShipments);
router.get('/shipments/:id', requireAdmin, shipmentController.getShipmentDetails);

/**
 * DISPATCH ENGINE OPERATIONS
 */
const dispatchController = require('../controllers/dispatch.controller');

router.post('/dispatch/:shipmentId', requireAdmin, dispatchController.initiateDispatch);
router.get('/dispatch/jobs', requireAdmin, dispatchController.listDispatchJobs);
router.get('/dispatch/jobs/:id', requireAdmin, dispatchController.getDispatchJobDetails);
router.post('/dispatch/jobs/:id/retry', requireAdmin, dispatchController.retryDispatch);
router.post('/dispatch/jobs/:id/cancel', requireAdmin, dispatchController.cancelDispatch);

module.exports = router;
