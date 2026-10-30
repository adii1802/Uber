const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');


const vehicleController = require('../controllers/vehicle.controller');

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

module.exports = router;
