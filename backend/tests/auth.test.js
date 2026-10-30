const request = require('supertest');
const mongoose = require('mongoose');

// Configure isolated test environment variables before requiring app
process.env.DB_CONNECT = 'mongodb://127.0.0.1:27017/cargoride_test_auth';
process.env.JWT_SECRET = 'cargoride_test_jwt_secret_key_1234567890';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const blacklistTokenModel = require('../models/blacklistToken.model');
const { bootstrap } = require('../scripts/bootstrap-admin');

// Constant CSRF test token (64 hex characters)
const VALID_CSRF_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

/**
 * Helper to extract JWT token from set-cookie headers
 */
const extractTokenFromCookies = (res) => {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  for (const cookieStr of setCookie) {
    const match = cookieStr.match(/^token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
};

/**
 * Helper to create cookie header array
 */
const makeCookies = (authToken = null, csrfToken = VALID_CSRF_TOKEN) => {
  const cookies = [];
  if (authToken) cookies.push(`token=${authToken}`);
  if (csrfToken) cookies.push(`XSRF-TOKEN=${csrfToken}`);
  return cookies;
};

describe('CargoRide Security Hardening: Admin Bootstrap, Cookie Auth & CSRF Protection', () => {
  jest.setTimeout(30000);

  let customerToken = null;
  let customerUser = null;
  let customer2Token = null;
  let customer2User = null;
  let transporterToken = null;
  let transporterUser = null;
  let adminToken = null;
  let adminUser = null;

  beforeAll(async () => {
    // Connect to strictly ISOLATED test database (never touches 'uber' database)
    await mongoose.connect(process.env.DB_CONNECT);

    // Sync database indexes (including partial unique index on isSuperAdmin)
    await adminModel.syncIndexes();
    await userModel.syncIndexes();
    await captainModel.syncIndexes();

    // Clear test collections in cargoride_test_auth
    await userModel.deleteMany({});
    await captainModel.deleteMany({});
    await adminModel.deleteMany({});
    await blacklistTokenModel.deleteMany({});
  });

  afterAll(async () => {
    // Drop ONLY the isolated test database, preserving existing local databases
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. ADMIN BOOTSTRAP & SINGLE-SUPER-ADMIN GUARANTEE
  // ==========================================
  describe('Part 1: Admin Bootstrap & Single-Super-Admin Guarantee', () => {
    it('1. should verify partial unique index on isSuperAdmin exists in MongoDB', async () => {
      await adminModel.init();
      const indexList = await adminModel.collection.indexes();
      const partialIndexSpec = indexList.find(
        (idx) => idx.key && idx.key.isSuperAdmin === 1
      );
      expect(partialIndexSpec).toBeDefined();
      expect(partialIndexSpec.unique).toBe(true);
      expect(partialIndexSpec.partialFilterExpression).toEqual({ isSuperAdmin: true });
    });

    it('2. should reject public HTTP admin registration and bootstrap routes with 404', async () => {
      // POST /admin/register must not exist
      const regRes = await request(app)
        .post('/admin/register')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({ email: 'fakeadmin@example.com', password: 'Password123!' });
      expect(regRes.status).toBe(404);

      // POST /admin/bootstrap must not exist
      const bootRes = await request(app)
        .post('/admin/bootstrap')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({ email: 'fakeadmin@example.com', password: 'Password123!' });
      expect(bootRes.status).toBe(404);
    });

    it('3. should successfully create first super administrator via CLI bootstrap module', async () => {
      const createdAdmin = await bootstrap(
        {
          firstname: 'Devansh',
          lastname: 'Sharma',
          email: 'admin@cargoride.in',
          password: 'SuperAdminPassword123!',
        },
        { disconnectOnFinish: false }
      );

      expect(createdAdmin).toBeDefined();
      expect(createdAdmin.email).toBe('admin@cargoride.in');
      expect(createdAdmin.role).toBe('ADMIN');
      expect(createdAdmin.isSuperAdmin).toBe(true);
      expect(createdAdmin.isActive).toBe(true);
      adminUser = createdAdmin;
    });

    it('4. should reject second bootstrap attempt when a super admin already exists', async () => {
      await expect(
        bootstrap(
          {
            firstname: 'Second',
            lastname: 'Admin',
            email: 'secondadmin@cargoride.in',
            password: 'SuperAdminPassword123!',
          },
          { disconnectOnFinish: false }
        )
      ).rejects.toThrow(/A Super Administrator already exists/i);
    });

    it('5. should enforce MongoDB database-level uniqueness constraint on isSuperAdmin', async () => {
      // Direct write attempt to bypass application checks and test MongoDB storage engine constraint
      let duplicateError = null;
      try {
        await adminModel.create({
          fullname: { firstname: 'Rogue', lastname: 'Admin' },
          email: 'rogue.superadmin@example.com',
          password: 'HashedPassword123!',
          role: 'ADMIN',
          isSuperAdmin: true, // Second document with isSuperAdmin: true
        });
      } catch (err) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
      expect(duplicateError.code).toBe(11000); // MongoDB E11000 duplicate key error

      // Contrast: Creating regular admins with isSuperAdmin: false MUST succeed
      const regularAdmin = await adminModel.create({
        fullname: { firstname: 'Regular', lastname: 'Operations' },
        email: 'ops.admin@cargoride.in',
        password: 'HashedPassword123!',
        role: 'ADMIN',
        isSuperAdmin: false,
      });
      expect(regularAdmin._id).toBeDefined();
      expect(regularAdmin.isSuperAdmin).toBe(false);
    });

    it('6. should reject bootstrap with invalid or missing credentials', async () => {
      // Temporarily delete super admin to test credential validation
      await adminModel.deleteMany({ isSuperAdmin: true });

      // Missing email
      await expect(
        bootstrap(
          { firstname: 'Test', email: '', password: 'Password123!' },
          { disconnectOnFinish: false }
        )
      ).rejects.toThrow(/Email and password must be provided/i);

      // Invalid email format
      await expect(
        bootstrap(
          { firstname: 'Test', email: 'invalid-email', password: 'Password123!' },
          { disconnectOnFinish: false }
        )
      ).rejects.toThrow(/Invalid administrative email/i);

      // Short password (< 8 chars)
      await expect(
        bootstrap(
          { firstname: 'Test', email: 'valid@example.com', password: 'short' },
          { disconnectOnFinish: false }
        )
      ).rejects.toThrow(/at least 8 characters/i);

      // Re-create the super admin for subsequent tests
      adminUser = await bootstrap(
        {
          firstname: 'Devansh',
          lastname: 'Sharma',
          email: 'admin@cargoride.in',
          password: 'SuperAdminPassword123!',
        },
        { disconnectOnFinish: false }
      );
      expect(adminUser.isSuperAdmin).toBe(true);
    });

    it('7. should log in super administrator via HTTP-only cookie without token in JSON response', async () => {
      const res = await request(app)
        .post('/admin/login')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          email: 'admin@cargoride.in',
          password: 'SuperAdminPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.admin).toMatchObject({
        email: 'admin@cargoride.in',
        role: 'ADMIN',
        isSuperAdmin: true,
      });
      // CRITICAL: JWT must NOT be returned in JSON response body
      expect(res.body.token).toBeUndefined();

      // JWT must be set in HTTP-only cookie
      const token = extractTokenFromCookies(res);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      adminToken = token;

      // Verify cookie flags
      const cookieHeader = res.headers['set-cookie'].find((c) => c.startsWith('token='));
      expect(cookieHeader).toMatch(/HttpOnly/i);
      expect(cookieHeader).toMatch(/Path=\//i);
    });
  });

  // ==========================================
  // 2. COOKIE AUTHENTICATION & CSRF PROTECTION
  // ==========================================
  describe('Part 2: Cookie Authentication & CSRF Protection', () => {
    it('8. should return CSRF token and set XSRF-TOKEN cookie via GET /csrf-token', async () => {
      const res = await request(app).get('/csrf-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
      expect(typeof res.body.csrfToken).toBe('string');
      expect(res.body.csrfToken.length).toBe(64); // 32 hex bytes

      const xsrfCookie = res.headers['set-cookie'].find((c) => c.startsWith('XSRF-TOKEN='));
      expect(xsrfCookie).toBeDefined();
      // XSRF-TOKEN must NOT be HttpOnly so Axios/browser JS can read it for the header
      expect(xsrfCookie).not.toMatch(/HttpOnly/i);
      expect(xsrfCookie).toMatch(/Path=\//i);
    });

    it('9. should reject state-changing POST requests when CSRF token is missing', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({
          fullname: { firstname: 'No', lastname: 'Csrf' },
          email: 'no.csrf@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Invalid or missing CSRF token/i);
    });

    it('10. should reject state-changing POST requests when CSRF token is mismatched', async () => {
      const res = await request(app)
        .post('/users/register')
        .set('x-xsrf-token', 'mismatched_token_12345678901234567890123456789012')
        .set('Cookie', [`XSRF-TOKEN=${VALID_CSRF_TOKEN}`])
        .send({
          fullname: { firstname: 'Mismatch', lastname: 'Csrf' },
          email: 'mismatch.csrf@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Invalid or missing CSRF token/i);
    });

    it('11. should reject state-changing POST requests from an untrusted origin', async () => {
      const res = await request(app)
        .post('/users/register')
        .set('Origin', 'http://malicious-website.com')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Evil', lastname: 'Origin' },
          email: 'evil.origin@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Untrusted request origin/i);
    });

    it('12. should register a customer with HTTP-only cookie and NO token in response body', async () => {
      const res = await request(app)
        .post('/users/register')
        .set('Origin', 'http://localhost:5173')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Aarav', lastname: 'Sharma' },
          email: 'aarav.sharma@example.com',
          password: 'Password123!',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      // No token in JSON body
      expect(res.body.token).toBeUndefined();
      expect(res.body.user).toMatchObject({
        fullname: { firstname: 'Aarav', lastname: 'Sharma' },
        email: 'aarav.sharma@example.com',
        role: 'CUSTOMER',
        isActive: true,
      });

      customerToken = extractTokenFromCookies(res);
      expect(customerToken).toBeDefined();
      customerUser = res.body.user;

      // Verify CORS credentials header
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('13. should reject duplicate customer registration', async () => {
      const res = await request(app)
        .post('/users/register')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Duplicate', lastname: 'User' },
          email: 'aarav.sharma@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/User already exists/i);
    });

    it('14. should log in customer with HTTP-only cookie and NO token in response body', async () => {
      const res = await request(app)
        .post('/users/login')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          email: 'aarav.sharma@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeUndefined();
      expect(res.body.user.email).toBe('aarav.sharma@example.com');
      expect(res.body.user.role).toBe('CUSTOMER');

      const token = extractTokenFromCookies(res);
      expect(token).toBeDefined();
      customerToken = token;
    });

    it('15. should register second customer for cross-account testing', async () => {
      const res = await request(app)
        .post('/users/register')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Priya', lastname: 'Patel' },
          email: 'priya.patel@example.com',
          password: 'Password123!',
          phone: '9812345678',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeUndefined();
      customer2Token = extractTokenFromCookies(res);
      customer2User = res.body.user;
    });

    it('16. should register a transporter with HTTP-only cookie and NO token in response body', async () => {
      const res = await request(app)
        .post('/captains/register')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Vikram', lastname: 'Singh' },
          email: 'vikram.singh@example.com',
          password: 'Password123!',
          phone: '9876501234',
          vehicle: {
            color: 'White',
            plate: 'MH-02-AB-1234',
            capacity: 1000,
            vehicleType: 'mini-truck',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeUndefined();
      expect(res.body.captain).toMatchObject({
        fullname: { firstname: 'Vikram', lastname: 'Singh' },
        email: 'vikram.singh@example.com',
        role: 'TRANSPORTER',
        isActive: true,
      });

      transporterToken = extractTokenFromCookies(res);
      expect(transporterToken).toBeDefined();
      transporterUser = res.body.captain;
    });

    it('17. should log in transporter with HTTP-only cookie and NO token in response body', async () => {
      const res = await request(app)
        .post('/captains/login')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          email: 'vikram.singh@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeUndefined();
      expect(res.body.captain.role).toBe('TRANSPORTER');

      const token = extractTokenFromCookies(res);
      expect(token).toBeDefined();
      transporterToken = token;
    });
  });

  // ==========================================
  // 3. EXCLUSIVE COOKIE AUTHENTICATION & BEARER TOKEN REJECTION
  // ==========================================
  describe('Part 3: Exclusive Cookie Authentication & Bearer Token Rejection', () => {
    it('18. should authenticate successfully using HTTP-only cookie on GET /users/profile', async () => {
      const res = await request(app)
        .get('/users/profile')
        .set('Cookie', makeCookies(customerToken));

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('aarav.sharma@example.com');
      expect(res.body.role).toBe('CUSTOMER');
    });

    it('19. should REJECT request when token is provided only in Authorization Bearer header', async () => {
      // Browser migration mandates rejecting Bearer tokens to eliminate client-side token exposure
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/No token provided/i);
    });

    it('20. should reject access when unauthenticated (no cookie provided)', async () => {
      const res = await request(app).get('/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/No token provided/i);
    });

    it('21. should reject access with invalid or malformed cookie token', async () => {
      const res = await request(app)
        .get('/users/profile')
        .set('Cookie', makeCookies('invalid.malformed.token'));

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired token/i);
    });

    it('22. should log out customer, clear cookie, and revoke token from subsequent use', async () => {
      // 1. Create a dedicated customer to test logout & token revocation
      const regRes = await request(app)
        .post('/users/register')
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies())
        .send({
          fullname: { firstname: 'Logout', lastname: 'Customer' },
          email: 'logout.user@example.com',
          password: 'Password123!',
        });
      const tempToken = extractTokenFromCookies(regRes);

      // Verify access before logout
      const beforeRes = await request(app)
        .get('/users/profile')
        .set('Cookie', makeCookies(tempToken));
      expect(beforeRes.status).toBe(200);

      // 2. Perform logout
      const logoutRes = await request(app)
        .get('/users/logout')
        .set('Cookie', makeCookies(tempToken));

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toMatch(/logged out successfully/i);

      // Verify cookie was cleared in response headers
      const clearCookie = logoutRes.headers['set-cookie'].find((c) => c.startsWith('token=;'));
      expect(clearCookie).toBeDefined();

      // Verify token is in blacklist collection
      const isBlacklisted = await blacklistTokenModel.findOne({ token: tempToken });
      expect(isBlacklisted).toBeDefined();

      // 3. Attempting to use the revoked token must fail with 401
      const afterRes = await request(app)
        .get('/users/profile')
        .set('Cookie', makeCookies(tempToken));

      expect(afterRes.status).toBe(401);
      expect(afterRes.body.message).toMatch(/revoked/i);
    });
  });

  // ==========================================
  // 4. RBAC & ROLE ISOLATION VIA COOKIES
  // ==========================================
  describe('Part 4: Role Isolation, RBAC & Object-Level Authorization', () => {
    it('23. Customer denied access to transporter-only routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/captains/profile')
        .set('Cookie', makeCookies(customerToken));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('24. Transporter accessing transporter-protected routes succeeds', async () => {
      const res = await request(app)
        .get('/captains/profile')
        .set('Cookie', makeCookies(transporterToken));

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('TRANSPORTER');
    });

    it('25. Transporter denied access to admin dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Cookie', makeCookies(transporterToken));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('26. Customer denied access to admin dashboard (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Cookie', makeCookies(customerToken));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('27. Admin accessing admin dashboard succeeds', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statistics');
      expect(res.body.statistics.totalCustomers).toBeGreaterThanOrEqual(1);
    });

    it('28. Deactivated account access is rejected (403 Forbidden)', async () => {
      // Admin deactivates customer2
      const deactRes = await request(app)
        .patch(`/admin/accounts/${customer2User._id}/status`)
        .set('x-xsrf-token', VALID_CSRF_TOKEN)
        .set('Cookie', makeCookies(adminToken))
        .send({ accountType: 'customer', isActive: false });

      expect(deactRes.status).toBe(200);
      expect(deactRes.body.account.isActive).toBe(false);

      // Customer2 attempts to access profile
      const accessRes = await request(app)
        .get('/users/profile')
        .set('Cookie', makeCookies(customer2Token));

      expect(accessRes.status).toBe(403);
      expect(accessRes.body.message).toMatch(/deactivated/i);
    });

    it('29. Cross-account data access is rejected (Object-level authorization)', async () => {
      // Customer 1 attempts to access Customer 2's private data endpoint
      const forbiddenRes = await request(app)
        .get(`/users/${customer2User._id}/data`)
        .set('Cookie', makeCookies(customerToken));

      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body.message).toMatch(/cannot access or modify another account/i);

      // Customer 1 accesses own private data endpoint -> succeeds
      const ownRes = await request(app)
        .get(`/users/${customerUser._id}/data`)
        .set('Cookie', makeCookies(customerToken));

      expect(ownRes.status).toBe(200);
      expect(ownRes.body.customerId).toBe(customerUser._id.toString());
    });
  });
});
