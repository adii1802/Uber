const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const userController = require('../controllers/user.controller');
const { requireCustomer, authorizeResourceOwner } = require('../middlewares/auth.middleware');

/**
 * CUSTOMER REGISTRATION
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
    body('phone')
      .optional()
      .isLength({ min: 10, max: 15 })
      .withMessage('Phone number must be between 10 and 15 digits'),
  ],
  userController.registerUser
);

/**
 * CUSTOMER LOGIN
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  userController.loginUser
);

/**
 * PROTECTED CUSTOMER ROUTES
 */
router.get('/profile', requireCustomer, userController.getUserProfile);
router.put(
  '/profile',
  [
    requireCustomer,
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
  userController.updateUserProfile
);
router.get('/me', requireCustomer, userController.getCurrentSession);
router.get('/logout', requireCustomer, userController.logoutUser);

/**
 * OBJECT-LEVEL AUTHORIZATION ROUTE (e.g., accessing own customer orders/data)
 */
router.get(
  '/:id/data',
  requireCustomer,
  authorizeResourceOwner(),
  (req, res) => {
    res.status(200).json({
      message: 'Access granted to private customer resource',
      customerId: req.params.id,
    });
  }
);

module.exports = router;
