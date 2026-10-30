const crypto = require('crypto');

/**
 * Cookie options for the client-readable CSRF token cookie (XSRF-TOKEN).
 * Must have httpOnly: false so that modern HTTP clients (e.g., Axios) can read it
 * and automatically include it in the X-XSRF-TOKEN header.
 */
const getCsrfCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  let sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');
  let secure = isProduction || process.env.COOKIE_SECURE === 'true';
  if (sameSite.toLowerCase() === 'none' && !secure) {
    secure = true;
  }
  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
  };
};

/**
 * Generate a cryptographically strong random CSRF token
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get allowed origins list for Origin/Referer verification
 */
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  }
  return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000'];
};

/**
 * Comprehensive Double-Submit CSRF Protection Middleware
 */
const csrfProtection = (req, res, next) => {
  // 1. Ensure XSRF-TOKEN cookie is set on all incoming requests if not already present
  let existingToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null;
  if (!existingToken) {
    existingToken = generateCsrfToken();
    res.cookie('XSRF-TOKEN', existingToken, getCsrfCookieOptions());
  }

  // 2. Safe HTTP methods do not mutate state and are exempted from validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 3. Verify Origin / Referer header if present
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try {
      origin = new URL(req.headers.referer).origin;
    } catch {
      origin = null;
    }
  }
  if (origin) {
    const allowed = getAllowedOrigins();
    if (!allowed.includes(origin)) {
      return res.status(403).json({ message: 'Forbidden: Untrusted request origin' });
    }
  }

  // 4. Extract client-provided CSRF token from header or body
  const clientToken =
    req.headers['x-xsrf-token'] ||
    req.headers['x-csrf-token'] ||
    (req.body && req.body._csrf);

  if (!clientToken || !existingToken) {
    return res.status(403).json({
      message: 'Forbidden: Invalid or missing CSRF token',
    });
  }

  // 5. Timing-safe comparison to prevent side-channel timing attacks
  const clientBuffer = Buffer.from(clientToken);
  const expectedBuffer = Buffer.from(existingToken);

  if (
    clientBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(clientBuffer, expectedBuffer)
  ) {
    return res.status(403).json({
      message: 'Forbidden: Invalid or missing CSRF token',
    });
  }

  next();
};

module.exports = {
  csrfProtection,
  generateCsrfToken,
  getCsrfCookieOptions,
};
