const authService = require('../services/auth.service');
const ROLES = require('../constants/roles');

/**
 * Extract authentication token exclusively from HTTP-only cookies.
 * Bearer token headers in browser requests are rejected to eliminate XSS token theft.
 */
const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

/**
 * Primary Authentication Middleware.
 * Verifies JWT signature, blacklist status, and resolves the trusted account from DB.
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const isRevoked = await authService.isTokenBlacklisted(token);
    if (isRevoked) {
      return res.status(401).json({ message: 'Unauthorized: Token has been revoked' });
    }

    let decoded;
    try {
      decoded = authService.verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }

    const accountId = decoded.id || decoded._id;
    const resolved = await authService.resolveAccount(accountId, decoded.role);

    if (!resolved || !resolved.account) {
      return res.status(401).json({ message: 'Unauthorized: Account not found' });
    }

    const { account, role } = resolved;

    if (account.isActive === false) {
      return res.status(403).json({ message: 'Forbidden: Account is deactivated' });
    }

    // Attach trusted identity details to request
    req.auth = {
      id: account._id,
      email: account.email,
      role: role || account.role,
    };
    req.user = account;
    req.account = account;

    // Backward compatibility for captain routes
    if (role === ROLES.TRANSPORTER) {
      req.captain = account;
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Authentication failed' });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard Middleware Factory.
 * Enforces that the authenticated user possesses one of the allowed roles.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        message: 'Forbidden: Insufficient permissions for this resource',
      });
    }

    next();
  };
};

/**
 * Object-level Authorization Middleware Factory.
 * Ensures the requesting user owns the target resource or is an ADMIN.
 */
const authorizeResourceOwner = (getOwnerIdFn) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    if (req.auth.role === ROLES.ADMIN) {
      return next(); // Admins have elevated access
    }

    const targetOwnerId =
      typeof getOwnerIdFn === 'function' ? getOwnerIdFn(req) : req.params.id;

    if (!targetOwnerId || req.auth.id.toString() !== targetOwnerId.toString()) {
      return res.status(403).json({
        message: 'Forbidden: You cannot access or modify another account’s resources',
      });
    }

    next();
  };
};

/**
 * Convenience Middleware Shortcuts
 */
const requireCustomer = [authenticateToken, authorizeRoles(ROLES.CUSTOMER)];
const requireTransporter = [authenticateToken, authorizeRoles(ROLES.TRANSPORTER)];
const requireAdmin = [authenticateToken, authorizeRoles(ROLES.ADMIN)];

/**
 * Backward-compatible User Auth Middleware
 */
const authUser = async (req, res, next) => {
  await authenticateToken(req, res, () => {
    if (req.auth.role !== ROLES.CUSTOMER) {
      return res.status(403).json({ message: 'Forbidden: Customer access only' });
    }
    next();
  });
};

/**
 * Backward-compatible Captain Auth Middleware
 */
const authCaptain = async (req, res, next) => {
  await authenticateToken(req, res, () => {
    if (req.auth.role !== ROLES.TRANSPORTER) {
      return res.status(403).json({ message: 'Forbidden: Transporter access only' });
    }
    next();
  });
};

module.exports = {
  getTokenFromRequest,
  authenticateToken,
  authorizeRoles,
  authorizeResourceOwner,
  requireCustomer,
  requireTransporter,
  requireAdmin,
  authUser,
  authCaptain,
};
