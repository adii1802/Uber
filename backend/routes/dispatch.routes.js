const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');

const dispatchController = require('../controllers/dispatch.controller');
const { requireTransporter } = require('../middlewares/auth.middleware');

/**
 * TRANSPORTER DISPATCH ROUTES
 * Base path: /dispatch
 */

// 1. List active pending offers for authenticated transporter
router.get('/offers', requireTransporter, dispatchController.getMyOffers);

// 2. Get offer details
router.get(
  '/offers/:id',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid offer ID format')],
  dispatchController.getOfferDetails
);

// 3. Accept a job offer
router.post(
  '/offers/:id/accept',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid offer ID format')],
  dispatchController.acceptOffer
);

// 4. Reject a job offer
router.post(
  '/offers/:id/reject',
  [
    ...requireTransporter,
    param('id').isMongoId().withMessage('Invalid offer ID format'),
    body('rejectionReason').optional().trim(),
  ],
  dispatchController.rejectOffer
);

// 5. List assigned jobs for authenticated transporter
router.get('/jobs', requireTransporter, dispatchController.getMyAssignedJobs);

// 6. Get assigned job details
router.get(
  '/jobs/:id',
  [...requireTransporter, param('id').isMongoId().withMessage('Invalid assignment ID format')],
  dispatchController.getAssignedJobDetails
);

module.exports = router;
