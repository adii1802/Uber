const request = require('supertest');
const mongoose = require('mongoose');

// Configure isolated test environment variables before requiring app
process.env.DB_CONNECT = 'mongodb://127.0.0.1:27017/cargoride_test_auth';
process.env.JWT_SECRET = 'cargoride_test_jwt_secret_key_1234567890';
process.env.ADMIN_BOOTSTRAP_SECRET = 'test_admin_bootstrap_secret_xyz';

const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const blacklistTokenModel = require('../models/blacklistToken.model');

describe('CargoRide Authentication, RBAC & Authorization Architecture', () => {
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
  // 1. CUSTOMER AUTHENTICATION
  // ==========================================
  describe('Customer Authentication', () => {
    it('1. should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({
          fullname: { firstname: 'Aarav', lastname: 'Sharma' },
          email: 'aarav.sharma@example.com',
          password: 'Password123!',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        fullname: { firstname: 'Aarav', lastname: 'Sharma' },
        email: 'aarav.sharma@example.com',
        phone: '9876543210',
        role: 'CUSTOMER',
        isActive: true,
      });
      expect(res.body.user.password).toBeUndefined();
      customerToken = res.body.token;
      customerUser = res.body.user;
    });

    it('2. should reject duplicate customer registration with same email', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({
          fullname: { firstname: 'Duplicate', lastname: 'User' },
          email: 'aarav.sharma@example.com', // same email
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'User already exists');
    });

    it('3. should log in an existing customer with valid credentials', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({
          email: 'aarav.sharma@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('aarav.sharma@example.com');
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('4. should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({
          email: 'aarav.sharma@example.com',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('5. should reject registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({
          email: 'incomplete@example.com',
          // missing password and fullname
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('6. should reject access with invalid or malformed token', async () => {
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired token/i);
    });

    it('7. should register second customer for cross-account testing', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({
          fullname: { firstname: 'Priya', lastname: 'Patel' },
          email: 'priya.patel@example.com',
          password: 'Password123!',
          phone: '9812345678',
        });

      expect(res.status).toBe(201);
      customer2Token = res.body.token;
      customer2User = res.body.user;
    });

    it('8. should log out customer and reject subsequent requests with revoked token', async () => {
      // Create temporary customer to test logout & token revocation
      const tempUserRes = await request(app)
        .post('/users/register')
        .send({
          fullname: { firstname: 'Logout', lastname: 'Test' },
          email: 'logout.test@example.com',
          password: 'Password123!',
        });

      const tempToken = tempUserRes.body.token;

      // Access profile successfully
      const profileBefore = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(profileBefore.status).toBe(200);

      // Logout and blacklist token
      const logoutRes = await request(app)
        .get('/users/logout')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(logoutRes.status).toBe(200);

      // Attempt to access profile with revoked token
      const profileAfter = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(profileAfter.status).toBe(401);
      expect(profileAfter.body.message).toMatch(/revoked/i);
    });
  });

  // ==========================================
  // 2. TRANSPORTER (CAPTAIN) AUTHENTICATION
  // ==========================================
  describe('Transporter Authentication', () => {
    it('should register a new transporter successfully with TRANSPORTER role', async () => {
      const res = await request(app)
        .post('/captains/register')
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
      expect(res.body).toHaveProperty('token');
      expect(res.body.captain).toMatchObject({
        fullname: { firstname: 'Vikram', lastname: 'Singh' },
        email: 'vikram.singh@example.com',
        role: 'TRANSPORTER',
        isActive: true,
      });
      transporterToken = res.body.token;
      transporterUser = res.body.captain;
    });

    it('should normalize vehicle type "moto" to "motorcycle" on registration', async () => {
      const res = await request(app)
        .post('/captains/register')
        .send({
          fullname: { firstname: 'Ramesh', lastname: 'Kumar' },
          email: 'ramesh.kumar@example.com',
          password: 'Password123!',
          vehicle: {
            color: 'Black',
            plate: 'DL-01-XY-9999',
            capacity: 50,
            vehicleType: 'moto', // legacy value
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.captain.vehicle.vehicleType).toBe('motorcycle');
    });

    it('should log in transporter successfully', async () => {
      const res = await request(app)
        .post('/captains/login')
        .send({
          email: 'vikram.singh@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.captain.role).toBe('TRANSPORTER');
    });
  });

  // ==========================================
  // 3. ADMIN BOOTSTRAP & AUTHENTICATION
  // ==========================================
  describe('Administrative Access & Bootstrap Lifecycle', () => {
    it('17. should reject public admin registration attempts', async () => {
      // No public /admin/register route exists
      const res = await request(app)
        .post('/admin/register')
        .send({ email: 'fakeadmin@example.com', password: 'Password123!' });

      expect(res.status).toBe(404);
    });

    it('18. should reject unauthorized admin bootstrap with invalid secret', async () => {
      const res = await request(app)
        .post('/admin/bootstrap')
        .set('x-admin-bootstrap-secret', 'wrong_secret')
        .send({
          firstname: 'System',
          lastname: 'Admin',
          email: 'admin@cargoride.in',
          password: 'AdminPassword123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('19. should allow initial admin bootstrap with valid secret and then permanently disable bootstrap', async () => {
      // 1. First bootstrap succeeds
      const res = await request(app)
        .post('/admin/bootstrap')
        .set('x-admin-bootstrap-secret', 'test_admin_bootstrap_secret_xyz')
        .send({
          firstname: 'System',
          lastname: 'Administrator',
          email: 'admin@cargoride.in',
          password: 'AdminPassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.admin).toMatchObject({
        email: 'admin@cargoride.in',
        role: 'ADMIN',
        isSuperAdmin: true,
      });
      adminToken = res.body.token;
      adminUser = res.body.admin;

      // 2. Second bootstrap attempt is permanently disabled
      const secondAttempt = await request(app)
        .post('/admin/bootstrap')
        .set('x-admin-bootstrap-secret', 'test_admin_bootstrap_secret_xyz')
        .send({
          firstname: 'Second',
          lastname: 'Attempt',
          email: 'hacker@example.com',
          password: 'Password123!',
        });

      expect(secondAttempt.status).toBe(403);
      expect(secondAttempt.body.message).toMatch(/permanently disabled/i);
    });

    it('should log in admin successfully and return ADMIN role', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({
          email: 'admin@cargoride.in',
          password: 'AdminPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.admin.role).toBe('ADMIN');
    });
  });

  // ==========================================
  // 4. ROLE-BASED ACCESS CONTROL (RBAC) & AUTHORIZATION
  // ==========================================
  describe('RBAC & Role Isolation', () => {
    it('9. Customer accessing customer-protected routes should succeed', async () => {
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('CUSTOMER');
    });

    it('10. Customer denied access to transporter-only routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/captains/profile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('11. Transporter accessing transporter-protected routes should succeed', async () => {
      const res = await request(app)
        .get('/captains/profile')
        .set('Authorization', `Bearer ${transporterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('TRANSPORTER');
    });

    it('12. Transporter denied access to admin-only routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${transporterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('13. Customer denied access to admin-only routes (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('14. Admin accessing admin-protected dashboard should succeed', async () => {
      const res = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statistics');
      expect(res.body.statistics.totalCustomers).toBeGreaterThanOrEqual(1);
    });

    it('15. Deactivated/Inactive account access should be denied (403 Forbidden)', async () => {
      // Deactivate customer via admin endpoint
      const deactivateRes = await request(app)
        .patch(`/admin/accounts/${customer2User._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ accountType: 'customer', isActive: false });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.account.isActive).toBe(false);

      // Attempt to access profile with deactivated account token
      const res = await request(app)
        .get('/users/profile')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });

    it('16. Cross-account resource access should be denied (Object-level authorization)', async () => {
      // customerUser attempts to access customer2's private data endpoint
      const res = await request(app)
        .get(`/users/${customer2User._id}/data`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot access or modify another account/i);

      // customerUser accesses own data endpoint -> succeeds
      const ownRes = await request(app)
        .get(`/users/${customerUser._id}/data`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(ownRes.status).toBe(200);
      expect(ownRes.body.customerId).toBe(customerUser._id.toString());
    });
  });

  // ==========================================
  // 5. HEALTH CHECK PRIVACY FOLLOW-UP
  // ==========================================
  describe('Health Endpoint Privacy Verification', () => {
    it('should return HTTP 200 without exposing database host or name', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'UP');
      expect(res.body.database).toHaveProperty('isConnected', true);
      expect(res.body.database).toHaveProperty('status', 'connected');
      expect(res.body.database.host).toBeUndefined();
      expect(res.body.database.name).toBeUndefined();
    });
  });
});
