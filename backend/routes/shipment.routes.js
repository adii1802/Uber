const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const shipmentController = require('../controllers/shipment.controller');
const { requireCustomer } = require('../middlewares/auth.middleware');

/**
 * CUSTOMER SHIPMENT CONSIGNMENT ROUTES
 */

// 1. List authenticated customer's shipments
router.get('/', requireCustomer, shipmentController.getMyShipments);

// 2. Retrieve detailed shipment information
router.get(
  '/:id',
  [...requireCustomer, param('id').isMongoId().withMessage('Invalid shipment ID format')],
  shipmentController.getShipmentDetails
);

module.exports = router;
