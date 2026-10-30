const request = require('supertest');
const mongoose = require('mongoose');

// Configure isolated test database for fleet management tests
process.env.DB_CONNECT = 'mongodb://127.0.0.1:27017/cargoride_test_fleet';
process.env.JWT_SECRET = 'cargoride_test_jwt_secret_fleet_0987654321';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const vehicleModel = require('../models/vehicle.model');
const VehicleCategory = require('../models/vehicleCategory.model');
const blacklistTokenModel = require('../models/blacklistToken.model');

// Constant CSRF test token (64 hex characters)
const VALID_CSRF = 'b1c2d3e4f5a60718293a4b5c6d7e8f90b1c2d3e4f5a60718293a4b5c6d7e8f90';

const extractCookie = (res, name = 'token') => {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  for (const c of setCookie) {
    const match = c.match(new RegExp(`^${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
};

const makeCookies = (token) => {
  const cookies = [`XSRF-TOKEN=${VALID_CSRF}`];
  if (token) cookies.push(`token=${token}`);
  return cookies;
};

describe('CargoRide Commercial Fleet & Vehicle Category Management Suite', () => {
  jest.setTimeout(30000);

  let customerToken = null;
  let transporter1Token = null;
  let transporter1Id = null;
  let transporter2Token = null;
  let transporter2Id = null;
  let adminToken = null;
  let miniTruckCat = null;
  let pickupCat = null;
  let createdVehicleId = null;

  beforeAll(async () => {
    // Connect strictly to ISOLATED test database (never touches 'uber')
    await mongoose.connect(process.env.DB_CONNECT);

    // Sync indexes
    await vehicleModel.createIndexes();
    await VehicleCategory.createIndexes();
    await captainModel.createIndexes();
    await userModel.createIndexes();
    await adminModel.createIndexes();

    // Clear test collections
    await userModel.deleteMany({});
    await captainModel.deleteMany({});
    await adminModel.deleteMany({});
    await vehicleModel.deleteMany({});
    await VehicleCategory.deleteMany({});
    await blacklistTokenModel.deleteMany({});

    // Seed standard commercial vehicle categories
    await VehicleCategory.seedDefaultCategories();
    miniTruckCat = await VehicleCategory.findOne({ code: 'MINI_TRUCK' });
    pickupCat = await VehicleCategory.findOne({ code: 'PICKUP_TRUCK' });

    // 1. Create Customer
    const custRes = await request(app)
      .post('/users/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Customer', lastname: 'User' },
        email: 'customer.fleet@example.com',
        password: 'Password123!',
      });
    customerToken = extractCookie(custRes);

    // 2. Create Transporter 1
    const t1Res = await request(app)
      .post('/captains/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Rajesh', lastname: 'Fleet' },
        email: 'rajesh.fleet1@example.com',
        password: 'Password123!',
        phone: '9800000001',
        vehicle: {
          color: 'White',
          plate: 'MH-01-AB-1001',
          capacity: 850,
          vehicleType: 'mini-truck',
        },
      });
    transporter1Token = extractCookie(t1Res);
    transporter1Id = t1Res.body.captain._id;

    // 3. Create Transporter 2
    const t2Res = await request(app)
      .post('/captains/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Sunil', lastname: 'Fleet' },
        email: 'sunil.fleet2@example.com',
        password: 'Password123!',
        phone: '9800000002',
        vehicle: {
          color: 'Blue',
          plate: 'MH-02-CD-2002',
          capacity: 1500,
          vehicleType: 'pickup',
        },
      });
    transporter2Token = extractCookie(t2Res);
    transporter2Id = t2Res.body.captain._id;

    // 4. Create Admin
    const hashedPassword = await adminModel.hashPassword('AdminPass123!');
    const admin = await adminModel.create({
      fullname: { firstname: 'Fleet', lastname: 'Admin' },
      email: 'fleetadmin@cargoride.in',
      password: hashedPassword,
      role: 'ADMIN',
      isSuperAdmin: true,
    });
    adminToken = admin.generateAuthToken();
  });

  afterAll(async () => {
    // Drop ONLY isolated test database
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. VEHICLE CATEGORIES
  // ==========================================
  describe('Commercial Vehicle Categories', () => {
    it('1. should retrieve available commercial vehicle categories', async () => {
      const res = await request(app).get('/vehicles/categories');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(6);

      const codes = res.body.categories.map((c) => c.code);
      expect(codes).toContain('THREE_WHEELER');
      expect(codes).toContain('MINI_TRUCK');
      expect(codes).toContain('PICKUP_TRUCK');
      expect(codes).toContain('LCV');
      expect(codes).toContain('MCV');
      expect(codes).toContain('HCV');

      const miniTruck = res.body.categories.find((c) => c.code === 'MINI_TRUCK');
      expect(miniTruck).toHaveProperty('payloadRange');
      expect(miniTruck.payloadRange.maxKg).toBe(1000);
      expect(miniTruck.cargoDimensions.lengthFt).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 2. TRANSPORTER FLEET MANAGEMENT (CRUD)
  // ==========================================
  describe('Transporter Fleet Management (Create, Read, Update, Deactivate)', () => {
    it('2. should allow authenticated transporter to register a commercial vehicle', async () => {
      const res = await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({
          registrationNumber: 'mh 12 ab 1234',
          category: miniTruckCat._id,
          manufacturer: 'Tata Motors',
          model: 'Ace Gold Diesel',
          manufacturingYear: 2022,
          payloadCapacityKg: 850,
          cargoBodyDimensions: {
            lengthFt: 7.2,
            widthFt: 4.9,
            heightFt: 4.8,
            bodyType: 'CLOSED_CONTAINER',
          },
          documentReferences: {
            rcNumber: 'RC-MH12-2022-0099',
            insuranceNumber: 'INS-TATA-9988',
            permitType: 'STATE_PERMIT',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('vehicle');
      expect(res.body.vehicle.registrationNumber).toBe('MH-12-AB-1234'); // Normalized
      expect(res.body.vehicle.manufacturer).toBe('Tata Motors');
      expect(res.body.vehicle.payloadCapacityKg).toBe(850);
      expect(res.body.vehicle.verificationStatus).toBe('PENDING'); // Initial status is PENDING
      expect(res.body.vehicle.availabilityStatus).toBe('AVAILABLE');
      expect(res.body.vehicle.isActive).toBe(true);
      expect(res.body.vehicle.cargoBodyDimensions.cargoVolumeCuFt).toBe(169); // 7.2 * 4.9 * 4.8 rounded
      expect(res.body.vehicle.transporter.toString()).toBe(transporter1Id.toString());

      createdVehicleId = res.body.vehicle._id;
    });

    it('3. should reject vehicle creation with missing required fields', async () => {
      const res = await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({
          registrationNumber: '',
          // missing manufacturer, model, payload
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('4. should reject vehicle creation with invalid or non-existent category', async () => {
      const fakeCategoryId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({
          registrationNumber: 'DL-01-XY-9999',
          category: fakeCategoryId,
          manufacturer: 'Mahindra',
          model: 'Bolero Maxi',
          manufacturingYear: 2021,
          payloadCapacityKg: 1200,
          cargoBodyDimensions: { lengthFt: 8, widthFt: 5, heightFt: 5 },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid or inactive vehicle category/i);
    });

    it('5. should reject vehicle registration with duplicate registration number (409 Conflict)', async () => {
      const res = await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token))
        .send({
          registrationNumber: 'MH-12-AB-1234', // Same as transporter1's vehicle
          category: pickupCat._id,
          manufacturer: 'Mahindra',
          model: 'Bolero',
          manufacturingYear: 2023,
          payloadCapacityKg: 1500,
          cargoBodyDimensions: { lengthFt: 8, widthFt: 5, heightFt: 5 },
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already registered/i);
    });

    it('6. should list only vehicles belonging to the authenticated transporter', async () => {
      // Create a vehicle for Transporter 2
      await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token))
        .send({
          registrationNumber: 'MH-14-GH-5678',
          category: pickupCat._id,
          manufacturer: 'Mahindra',
          model: 'Bolero Camper',
          manufacturingYear: 2023,
          payloadCapacityKg: 1300,
          cargoBodyDimensions: { lengthFt: 8, widthFt: 5, heightFt: 5 },
        });

      // Transporter 1 queries my vehicles
      const res1 = await request(app)
        .get('/vehicles')
        .set('Cookie', makeCookies(transporter1Token));

      expect(res1.status).toBe(200);
      expect(res1.body.count).toBe(1);
      expect(res1.body.vehicles[0].registrationNumber).toBe('MH-12-AB-1234');

      // Transporter 2 queries my vehicles
      const res2 = await request(app)
        .get('/vehicles')
        .set('Cookie', makeCookies(transporter2Token));

      expect(res2.status).toBe(200);
      expect(res2.body.count).toBe(1);
      expect(res2.body.vehicles[0].registrationNumber).toBe('MH-14-GH-5678');
    });

    it('7. should allow transporter to retrieve details of own vehicle', async () => {
      const res = await request(app)
        .get(`/vehicles/${createdVehicleId}`)
        .set('Cookie', makeCookies(transporter1Token));

      expect(res.status).toBe(200);
      expect(res.body.vehicle._id.toString()).toBe(createdVehicleId.toString());
      expect(res.body.vehicle.model).toBe('Ace Gold Diesel');
      expect(res.body.vehicle.category.code).toBe('MINI_TRUCK');
    });

    it('8. should allow transporter to update vehicle specifications', async () => {
      const res = await request(app)
        .put(`/vehicles/${createdVehicleId}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({
          model: 'Ace Gold Plus 2024',
          payloadCapacityKg: 900,
          cargoBodyDimensions: {
            lengthFt: 7.5,
            widthFt: 5.0,
            heightFt: 5.0,
            bodyType: 'CLOSED_CONTAINER',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.vehicle.model).toBe('Ace Gold Plus 2024');
      expect(res.body.vehicle.payloadCapacityKg).toBe(900);
      expect(res.body.vehicle.cargoBodyDimensions.lengthFt).toBe(7.5);
      expect(res.body.vehicle.cargoBodyDimensions.cargoVolumeCuFt).toBe(188);
    });

    it('9. should prevent transporter from altering ownership or verification status via update', async () => {
      const rogueTransporterId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/vehicles/${createdVehicleId}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({
          transporter: rogueTransporterId,
          verificationStatus: 'APPROVED', // Client attempt to self-approve
        });

      expect(res.status).toBe(200);
      // Ownership and verification status must remain unchanged
      expect(res.body.vehicle.transporter.toString()).toBe(transporter1Id.toString());
      expect(res.body.vehicle.verificationStatus).toBe('PENDING');
    });

    it('10. should allow transporter to update availability status', async () => {
      const res = await request(app)
        .patch(`/vehicles/${createdVehicleId}/availability`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({ availabilityStatus: 'ON_TRIP' });

      expect(res.status).toBe(200);
      expect(res.body.vehicle.availabilityStatus).toBe('ON_TRIP');

      // Reset back to AVAILABLE
      const resReset = await request(app)
        .patch(`/vehicles/${createdVehicleId}/availability`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({ availabilityStatus: 'AVAILABLE' });

      expect(resReset.status).toBe(200);
      expect(resReset.body.vehicle.availabilityStatus).toBe('AVAILABLE');
    });

    it('11. should reject invalid availability status value', async () => {
      const res = await request(app)
        .patch(`/vehicles/${createdVehicleId}/availability`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token))
        .send({ availabilityStatus: 'FLYING' });

      expect(res.status).toBe(400);
    });

    it('12. should allow transporter to deactivate a vehicle (soft delete)', async () => {
      const res = await request(app)
        .patch(`/vehicles/${createdVehicleId}/deactivate`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token));

      expect(res.status).toBe(200);
      expect(res.body.vehicle.isActive).toBe(false);
      expect(res.body.vehicle.availabilityStatus).toBe('UNAVAILABLE');

      // Re-activate for downstream tests
      await vehicleModel.findByIdAndUpdate(createdVehicleId, {
        isActive: true,
        availabilityStatus: 'AVAILABLE',
      });
    });
  });

  // ==========================================
  // 3. OBJECT-LEVEL AUTHORIZATION & CROSS-ACCOUNT SECURITY
  // ==========================================
  describe('Object-Level Authorization & Cross-Account Isolation', () => {
    it('13. Transporter 2 denied access to Transporter 1 vehicle (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/vehicles/${createdVehicleId}`)
        .set('Cookie', makeCookies(transporter2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('14. Transporter 2 denied updating Transporter 1 vehicle (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/vehicles/${createdVehicleId}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token))
        .send({ model: 'Hacked Model' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('15. Transporter 2 denied deactivating Transporter 1 vehicle (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/vehicles/${createdVehicleId}/deactivate`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('16. Customer account denied access to transporter vehicle endpoints (403 Forbidden)', async () => {
      // Customer tries to list vehicles
      const listRes = await request(app)
        .get('/vehicles')
        .set('Cookie', makeCookies(customerToken));

      expect(listRes.status).toBe(403);
      expect(listRes.body.message).toMatch(/Forbidden|Insufficient permissions/i);

      // Customer tries to register a vehicle
      const createRes = await request(app)
        .post('/vehicles')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customerToken))
        .send({
          registrationNumber: 'DL-05-AB-0001',
          category: miniTruckCat._id,
          manufacturer: 'Tata',
          model: 'Ace',
          manufacturingYear: 2020,
          payloadCapacityKg: 750,
          cargoBodyDimensions: { lengthFt: 7, widthFt: 4, heightFt: 4 },
        });

      expect(createRes.status).toBe(403);
      expect(createRes.body.message).toMatch(/Forbidden|Insufficient permissions/i);
    });
  });

  // ==========================================
  // 4. ADMIN FLEET REVIEW & VERIFICATION
  // ==========================================
  describe('Admin Fleet Review & Verification Workflow', () => {
    it('17. Admin can list all submitted vehicles across transporters with pagination', async () => {
      const res = await request(app)
        .get('/admin/vehicles')
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('vehicles');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
      expect(res.body.vehicles[0]).toHaveProperty('transporter');
      expect(res.body.vehicles[0].transporter).toHaveProperty('fullname');
    });

    it('18. Admin can review full details of any vehicle', async () => {
      const res = await request(app)
        .get(`/admin/vehicles/${createdVehicleId}`)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.vehicle._id.toString()).toBe(createdVehicleId.toString());
      expect(res.body.vehicle.transporter.email).toBe('rajesh.fleet1@example.com');
    });

    it('19. Admin can approve vehicle verification', async () => {
      const res = await request(app)
        .patch(`/admin/vehicles/${createdVehicleId}/verify`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({
          decision: 'APPROVED',
          notes: 'Commercial fitness and state permit verified.',
        });

      expect(res.status).toBe(200);
      expect(res.body.vehicle.verificationStatus).toBe('APPROVED');
      expect(res.body.vehicle.verificationDetails).toHaveProperty('reviewedAt');
      expect(res.body.vehicle.verificationDetails.notes).toBe(
        'Commercial fitness and state permit verified.'
      );
    });

    it('20. Admin can reject vehicle verification with mandatory reason', async () => {
      // First attempt rejection without reason -> must fail with 400
      const failRes = await request(app)
        .patch(`/admin/vehicles/${createdVehicleId}/verify`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({
          decision: 'REJECTED',
          rejectionReason: '',
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.message).toMatch(/Rejection reason is required/i);

      // Rejection with valid reason -> succeeds
      const successRes = await request(app)
        .patch(`/admin/vehicles/${createdVehicleId}/verify`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({
          decision: 'REJECTED',
          rejectionReason: 'Fitness certificate expired. Please submit valid fitness renewal.',
          notes: 'Flagged for re-submission.',
        });

      expect(successRes.status).toBe(200);
      expect(successRes.body.vehicle.verificationStatus).toBe('REJECTED');
      expect(successRes.body.vehicle.verificationDetails.rejectionReason).toBe(
        'Fitness certificate expired. Please submit valid fitness renewal.'
      );
    });
  });
});
