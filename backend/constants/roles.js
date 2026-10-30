/**
 * Canonical Role Definitions for CargoRide Platform.
 * Used throughout backend authorization, token generation, and frontend guards.
 */
const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  TRANSPORTER: 'TRANSPORTER',
  ADMIN: 'ADMIN',
});

module.exports = ROLES;
