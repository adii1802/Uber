const shipmentService = require('../services/shipment.service');

/**
 * Customer: List shipments belonging to authenticated customer
 */
const getMyShipments = async (req, res, next) => {
  try {
    const customerId = req.auth.id;
    const shipments = await shipmentService.getCustomerShipments(customerId, req.query);
    return res.status(200).json({
      shipments,
      count: shipments.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Customer / Admin: Get detailed shipment specifications
 */
const getShipmentDetails = async (req, res, next) => {
  try {
    const shipment = await shipmentService.getShipmentById(req.params.id, req.auth);
    return res.status(200).json({ shipment });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all shipments across all customers
 */
const listAdminShipments = async (req, res, next) => {
  try {
    const result = await shipmentService.listAllShipmentsForAdmin(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyShipments,
  getShipmentDetails,
  listAdminShipments,
};
