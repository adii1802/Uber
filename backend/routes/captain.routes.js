const express = require('express');
const router = express.Router();
const {body} = require('express-validator');
const captainController = require('../controllers/captain.controller');

router.post('/create', [
   body('email').isEmail().withMessage('Invalid email address'),
   body('fullname.firstname ').isLength({min:3}).withMessage('Firstname must be at least 3 characters long'),
    body('password').isLength({min:6}).withMessage('Password must be at least 6 characters long'),
    body('vehical.color').isLength({min:3}).withMessage('Color must be at least 3 characters long'),
    body('vehical.plate').isLength({min:3}).withMessage('Plate must be at least 3 characters long'),    
    body('vehical.capacity').isInt({min:1}).withMessage('Capacity must be at least 1'),
    body('vehical.vehicalType').isIn(['car','motorcycle','auto']).withMessage('Invalid vehical type')
], 
captainController.registerCaptain
)


module.exports = router;