const request = require('supertest');
const mongoose = require('mongoose');

// Configure isolated test database for cargo booking & shipment lifecycle
process.env.DB_CONNECT = 'mongodb://127.0.0.1:27017/cargoride_test_booking';
process.env.JWT_SECRET = 'cargoride_test_jwt_secret_booking_12345678';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const VehicleCategory = require('../models/vehicleCategory.model');
const CargoBooking = require('../models/cargoBooking.model');
const Shipment = require('../models/shipment.model');
const IdempotencyRecord = require('../models/idempotency.model');
const blacklistTokenModel = require('../models/blacklistToken.model');

const VALID_CSRF = 'c1c2c3c4d5d60718293a4b5c6d7e8f90c1c2c3c4d5d60718293a4b5c6d7e8f90';

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

describe('CargoRide Cargo Booking & Shipment Consignment Lifecycle Suite', () => {
  jest.setTimeout(30000);

  let customer1Token = null;
  let customer1Id = null;
  let customer2Token = null;
  let customer2Id = null;
  let transporterToken = null;
  let adminToken = null;
  let miniTruckCat = null;
  let lcvCat = null;
  let createdBookingId = null;
  let confirmedShipmentId = null;

  const validBookingPayload = {
    pickup: {
      addressLine: 'Plot 42, Sector 18, Udyog Vihar Industrial Area',
      locality: 'Sector 18',
      city: 'Gurugram',
      state: 'Haryana',
      postalCode: '122015',
      country: 'India',
      coordinates: { latitude: 28.498, longitude: 77.081 },
      contactPerson: 'Suresh Verma',
      contactPhone: '9810123456',
    },
    dropoff: {
      addressLine: 'Shed 12, Okhla Industrial Area Phase-III',
      locality: 'Okhla Phase 3',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110020',
      country: 'India',
      coordinates: { latitude: 28.535, longitude: 77.272 },
      contactPerson: 'Anil Mehta',
      contactPhone: '9820123456',
    },
    cargo: {
      name: 'Industrial Valve Assemblies',
      category: 'INDUSTRIAL_GOODS',
      weightKg: 850,
      dimensions: {
        lengthFt: 6.5,
        widthFt: 4.5,
        heightFt: 4.0,
      },
      packageCount: 14,
      packagingType: 'WOODEN_CRATES',
      isFragile: false,
      handlingInstructions: 'Forklift accessible. Keep dry and upright.',
    },
    requestedVehicleCategory: null, // assigned in beforeAll
    requestedPickupAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    specialInstructions: 'Commercial loading dock available at both locations.',
  };

  beforeAll(async () => {
    // Connect to strictly ISOLATED test database
    await mongoose.connect(process.env.DB_CONNECT);

    // Sync indexes
    await CargoBooking.createIndexes();
    await Shipment.createIndexes();
    await IdempotencyRecord.createIndexes();
    await VehicleCategory.createIndexes();
    await userModel.createIndexes();
    await captainModel.createIndexes();
    await adminModel.createIndexes();

    // Clear collections
    await userModel.deleteMany({});
    await captainModel.deleteMany({});
    await adminModel.deleteMany({});
    await CargoBooking.deleteMany({});
    await Shipment.deleteMany({});
    await IdempotencyRecord.deleteMany({});
    await VehicleCategory.deleteMany({});
    await blacklistTokenModel.deleteMany({});

    // Seed Categories
    await VehicleCategory.seedDefaultCategories();
    miniTruckCat = await VehicleCategory.findOne({ code: 'MINI_TRUCK' });
    lcvCat = await VehicleCategory.findOne({ code: 'LCV' });
    validBookingPayload.requestedVehicleCategory = miniTruckCat._id.toString();

    // Create Customer 1
    const c1Res = await request(app)
      .post('/users/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Industrial', lastname: 'Customer' },
        email: 'industry.client1@example.com',
        password: 'Password123!',
      });
    customer1Token = extractCookie(c1Res);
    customer1Id = c1Res.body.user._id;

    // Create Customer 2
    const c2Res = await request(app)
      .post('/users/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Second', lastname: 'Customer' },
        email: 'industry.client2@example.com',
        password: 'Password123!',
      });
    customer2Token = extractCookie(c2Res);
    customer2Id = c2Res.body.user._id;

    // Create Transporter
    const tRes = await request(app)
      .post('/captains/register')
      .set('x-xsrf-token', VALID_CSRF)
      .set('Cookie', makeCookies())
      .send({
        fullname: { firstname: 'Trucking', lastname: 'Operator' },
        email: 'transporter.ops@example.com',
        password: 'Password123!',
        phone: '9811223344',
        vehicle: {
          color: 'Yellow',
          plate: 'DL-01-EE-5555',
          capacity: 1000,
          vehicleType: 'mini-truck',
        },
      });
    transporterToken = extractCookie(tRes);

    // Create Admin
    const hashedPassword = await adminModel.hashPassword('AdminPass123!');
    const admin = await adminModel.create({
      fullname: { firstname: 'Booking', lastname: 'Supervisor' },
      email: 'bookings@cargoride.in',
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
  // 1. CARGO BOOKING CREATION & VALIDATION
  // ==========================================
  describe('Cargo Booking Creation & Input Validation', () => {
    it('1. should create a valid commercial cargo booking request', async () => {
      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(validBookingPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('booking');
      expect(res.body.booking.bookingReference).toMatch(/^CRB-\d{8}-[A-F0-9]{5}$/);
      expect(res.body.booking.bookingStatus).toBe('REQUESTED');
      expect(res.body.booking.cargo.name).toBe('Industrial Valve Assemblies');
      expect(res.body.booking.cargo.weightKg).toBe(850);
      expect(res.body.booking.cargo.dimensions.volumeCuFt).toBe(117); // 6.5 * 4.5 * 4.0
      expect(res.body.booking.customer.toString()).toBe(customer1Id.toString());
      expect(res.body.booking.pickup.city).toBe('Gurugram');
      expect(res.body.booking.dropoff.city).toBe('New Delhi');

      createdBookingId = res.body.booking._id;
    });

    it('2. should reject booking when pickup address is missing', async () => {
      const invalidPayload = {
        ...validBookingPayload,
        pickup: { ...validBookingPayload.pickup, addressLine: '' },
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('3. should reject booking with invalid cargo weight (<= 0 kg)', async () => {
      const invalidPayload = {
        ...validBookingPayload,
        cargo: { ...validBookingPayload.cargo, weightKg: 0 },
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('4. should reject booking with invalid 5-digit or malformed Indian postal code', async () => {
      const invalidPayload = {
        ...validBookingPayload,
        pickup: { ...validBookingPayload.pickup, postalCode: '12201' }, // only 5 digits
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('5. should reject booking with non-existent vehicle category', async () => {
      const invalidPayload = {
        ...validBookingPayload,
        requestedVehicleCategory: new mongoose.Types.ObjectId().toString(),
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid or inactive commercial vehicle category/i);
    });

    it('6. should reject booking with invalid out-of-range coordinates', async () => {
      const invalidPayload = {
        ...validBookingPayload,
        pickup: {
          ...validBookingPayload.pickup,
          coordinates: { latitude: 120, longitude: 77 }, // lat > 90
        },
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 2. IDEMPOTENCY & DUPLICATE SUBMISSION DEFENSE
  // ==========================================
  describe('Idempotency & Duplicate Prevention', () => {
    const idempotencyKey = 'idemp_key_commercial_cargo_001';

    it('7. should return original cached booking response on duplicate idempotency key submission', async () => {
      // First submission with Idempotency-Key
      const res1 = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('idempotency-key', idempotencyKey)
        .set('Cookie', makeCookies(customer1Token))
        .send(validBookingPayload);

      expect(res1.status).toBe(201);
      const originalBookingRef = res1.body.booking.bookingReference;

      // Second identical submission with same Idempotency-Key
      const res2 = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('idempotency-key', idempotencyKey)
        .set('Cookie', makeCookies(customer1Token))
        .send(validBookingPayload);

      expect(res2.status).toBe(201);
      expect(res2.headers['x-cache-lookup']).toBe('HIT');
      expect(res2.body.booking.bookingReference).toBe(originalBookingRef);
    });

    it('8. should reject reuse of the same idempotency key with a different payload (409 Conflict)', async () => {
      const alteredPayload = {
        ...validBookingPayload,
        cargo: { ...validBookingPayload.cargo, weightKg: 2500 }, // altered weight
      };

      const res = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('idempotency-key', idempotencyKey)
        .set('Cookie', makeCookies(customer1Token))
        .send(alteredPayload);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Conflict: Idempotency key already used with a different request payload/i);
    });
  });

  // ==========================================
  // 3. AUTHORIZATION & CROSS-ACCOUNT ISOLATION
  // ==========================================
  describe('Authorization & Cross-Account Isolation', () => {
    it('9. Customer 1 can retrieve own booking details', async () => {
      const res = await request(app)
        .get(`/bookings/${createdBookingId}`)
        .set('Cookie', makeCookies(customer1Token));

      expect(res.status).toBe(200);
      expect(res.body.booking._id.toString()).toBe(createdBookingId.toString());
    });

    it('10. Customer 2 denied access to Customer 1 booking (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/bookings/${createdBookingId}`)
        .set('Cookie', makeCookies(customer2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('11. Customer 2 denied cancelling Customer 1 booking (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/bookings/${createdBookingId}/cancel`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer2Token))
        .send({ cancellationReason: 'Malicious cancellation' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('12. Transporter account denied access to customer booking endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/bookings')
        .set('Cookie', makeCookies(transporterToken));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden|Insufficient permissions/i);
    });

    it('13. Admin can list all bookings across all customers with pagination', async () => {
      const res = await request(app)
        .get('/admin/bookings')
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bookings');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
      expect(res.body.bookings[0]).toHaveProperty('customer');
      expect(res.body.bookings[0].customer).toHaveProperty('fullname');
    });
  });

  // ==========================================
  // 4. BOOKING LIFECYCLE, STATE TRANSITIONS & SHIPMENT ATOMICITY
  // ==========================================
  describe('Booking Lifecycle, State Transitions & Shipment Creation', () => {
    it('14. Admin confirms REQUESTED booking -> transitions to CONFIRMED and creates exactly one Shipment', async () => {
      const res = await request(app)
        .patch(`/admin/bookings/${createdBookingId}/status`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.booking.bookingStatus).toBe('CONFIRMED');
      expect(res.body.booking).toHaveProperty('confirmedAt');

      // Shipment consignment must be created
      expect(res.body).toHaveProperty('shipment');
      expect(res.body.shipment.shipmentReference).toMatch(/^CRS-\d{8}-[A-F0-9]{5}$/);
      expect(res.body.shipment.shipmentStatus).toBe('CREATED');
      expect(res.body.shipment.booking.toString()).toBe(createdBookingId.toString());
      expect(res.body.shipment.customer.toString()).toBe(customer1Id.toString());

      confirmedShipmentId = res.body.shipment._id;
    });

    it('15. Repeated confirmation attempt rejects transition and does NOT create duplicate shipments', async () => {
      const res = await request(app)
        .patch(`/admin/bookings/${createdBookingId}/status`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid state transition: Cannot confirm booking in 'CONFIRMED' status/i);

      // Verify in database that exactly ONE shipment exists for this booking
      const shipmentCount = await Shipment.countDocuments({ booking: createdBookingId });
      expect(shipmentCount).toBe(1);
    });

    it('16. Customer can retrieve own created shipment consignment', async () => {
      const res = await request(app)
        .get(`/shipments/${confirmedShipmentId}`)
        .set('Cookie', makeCookies(customer1Token));

      expect(res.status).toBe(200);
      expect(res.body.shipment._id.toString()).toBe(confirmedShipmentId.toString());
      expect(res.body.shipment.shipmentStatus).toBe('CREATED');
      expect(res.body.shipment.bookingReference).toMatch(/^CRB-/);
    });

    it('17. Customer 2 denied access to Customer 1 shipment (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/shipments/${confirmedShipmentId}`)
        .set('Cookie', makeCookies(customer2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('18. Customer can cancel eligible REQUESTED booking', async () => {
      // Create a fresh booking to test cancellation
      const newBookingRes = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(validBookingPayload);

      const cancelBookingId = newBookingRes.body.booking._id;

      const cancelRes = await request(app)
        .patch(`/bookings/${cancelBookingId}/cancel`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send({ cancellationReason: 'Production order rescheduled by factory' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.booking.bookingStatus).toBe('CANCELLED');
      expect(cancelRes.body.booking.cancellationParty).toBe('CUSTOMER');
      expect(cancelRes.body.booking.cancellationReason).toBe(
        'Production order rescheduled by factory'
      );
    });

    it('19. Cancelled booking CANNOT be confirmed by administrator (Transition Rejected)', async () => {
      // Create and cancel a booking
      const newBookingRes = await request(app)
        .post('/bookings')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send(validBookingPayload);

      const cancelId = newBookingRes.body.booking._id;

      await request(app)
        .patch(`/bookings/${cancelId}/cancel`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customer1Token))
        .send({ cancellationReason: 'Customer canceled' });

      // Admin tries to confirm cancelled booking
      const res = await request(app)
        .patch(`/admin/bookings/${cancelId}/status`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken))
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid state transition: Cannot confirm booking in 'CANCELLED' status/i);

      // Verify no shipment was created
      const shipment = await Shipment.findOne({ booking: cancelId });
      expect(shipment).toBeNull();
    });

    it('20. Admin can list all shipments created across the marketplace', async () => {
      const res = await request(app)
        .get('/admin/shipments')
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('shipments');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.shipments.length).toBeGreaterThanOrEqual(1);
      expect(res.body.shipments[0]).toHaveProperty('shipmentReference');
    });
  });
});
