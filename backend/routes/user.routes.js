const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * REGISTER USER
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
  ],
  userController.registerUser
);


/**
 * LOGIN USER
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
 * PROTECTED ROUTES
 */
router.get('/profile', authMiddleware.authUser, userController.getUserProfile);
router.get('/logout', authMiddleware.authUser, userController.logoutUser);

module.exports = router;
