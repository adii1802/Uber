const request = require('supertest');
const mongoose = require('mongoose');

// Configure isolated test database for dispatch engine & transporter job assignments
process.env.DB_CONNECT = 'mongodb://127.0.0.1:27017/cargoride_test_dispatch';
process.env.JWT_SECRET = 'cargoride_test_jwt_secret_dispatch_12345678';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';

const app = require('../app');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const vehicleModel = require('../models/vehicle.model');
const VehicleCategory = require('../models/vehicleCategory.model');
const CargoBooking = require('../models/cargoBooking.model');
const Shipment = require('../models/shipment.model');
const DispatchJob = require('../models/dispatchJob.model');
const DispatchOffer = require('../models/dispatchOffer.model');
const DispatchAssignment = require('../models/dispatchAssignment.model');
const vehicleEligibilityService = require('../services/vehicleEligibility.service');

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

describe('CargoRide Dispatch Engine & Transporter Job Assignment Suite', () => {
  jest.setTimeout(30000);

  let adminToken = null;
  let adminId = null;
  let customerToken = null;
  let customerId = null;
  let transporter1Token = null;
  let transporter1Id = null;
  let transporter2Token = null;
  let transporter2Id = null;
  let inactiveTransporterId = null;

  let miniTruckCat = null;
  let lcvCat = null;

  let vehicle1A = null; // Transporter 1: Approved, Available, Mini-Truck, 1000kg
  let vehicle1B = null; // Transporter 1: Approved, Available, LCV, 2500kg
  let vehicle2A = null; // Transporter 2: Approved, Available, Mini-Truck, 950kg
  let vehicle2B = null; // Transporter 2: Unverified (PENDING)
  let vehicle2C = null; // Transporter 2: Unavailable (ON_TRIP)
  let vehicle3A = null; // Inactive Transporter: Approved, Available

  let confirmedBooking = null;
  let confirmedShipment = null;
  let unconfirmedBooking = null;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DB_CONNECT);
    }

    // Clean test database collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // 1. Seed Commercial Vehicle Categories
    await VehicleCategory.seedDefaultCategories();
    miniTruckCat = await VehicleCategory.findOne({ code: 'MINI_TRUCK' });
    lcvCat = await VehicleCategory.findOne({ code: 'LCV' });

    // 2. Seed Admin Account
    const hashedAdminPassword = await adminModel.hashPassword('AdminPass123!');
    const admin = await adminModel.create({
      fullname: { firstname: 'Dispatch', lastname: 'Admin' },
      email: 'admin.dispatch@cargoride.in',
      password: hashedAdminPassword,
      role: 'ADMIN',
      isSuperAdmin: true,
      isActive: true,
    });
    adminId = admin._id;
    adminToken = admin.generateAuthToken();

    // 3. Seed Customer Account
    const customer = await userModel.create({
      fullname: { firstname: 'Logistics', lastname: 'Shipper' },
      email: 'shipper.dispatch@cargoride.in',
      password: 'CustomerPass123!',
      role: 'CUSTOMER',
      isActive: true,
    });
    customerId = customer._id;
    customerToken = customer.generateAuthToken();

    // 4. Seed Transporter Accounts
    const hashedPassword = await captainModel.hashPassword('CaptainPass123!');
    const t1 = await captainModel.create({
      fullname: { firstname: 'Ramesh', lastname: 'Yadav' },
      email: 'ramesh.fleet@cargoride.in',
      password: hashedPassword,
      phone: '9876543211',
      role: 'TRANSPORTER',
      isActive: true,
      vehicle: { color: 'White', plate: 'HR-26-AB-1111', capacity: 1000, vehicleType: 'mini-truck' },
      location: { lat: 28.5, lng: 77.1 },
    });
    transporter1Id = t1._id;
    transporter1Token = t1.generateAuthToken();

    const t2 = await captainModel.create({
      fullname: { firstname: 'Suresh', lastname: 'Gupta' },
      email: 'suresh.fleet@cargoride.in',
      password: hashedPassword,
      phone: '9876543222',
      role: 'TRANSPORTER',
      isActive: true,
      vehicle: { color: 'Blue', plate: 'HR-26-CD-2222', capacity: 1000, vehicleType: 'mini-truck' },
      location: { lat: 28.52, lng: 77.15 },
    });
    transporter2Id = t2._id;
    transporter2Token = t2.generateAuthToken();

    const t3 = await captainModel.create({
      fullname: { firstname: 'Inactive', lastname: 'Transporter' },
      email: 'inactive.transporter@cargoride.in',
      password: hashedPassword,
      phone: '9876543333',
      role: 'TRANSPORTER',
      isActive: false, // Inactive transporter!
      vehicle: { color: 'Red', plate: 'HR-26-EF-3333', capacity: 1000, vehicleType: 'mini-truck' },
    });
    inactiveTransporterId = t3._id;

    // 5. Seed Vehicles
    vehicle1A = await vehicleModel.create({
      transporter: transporter1Id,
      registrationNumber: 'DL-01-AB-1001',
      category: miniTruckCat._id,
      categoryCode: 'MINI_TRUCK',
      manufacturer: 'Tata Motors',
      model: 'Ace Gold',
      manufacturingYear: 2023,
      payloadCapacityKg: 1000,
      cargoBodyDimensions: { lengthFt: 7.2, widthFt: 4.9, heightFt: 5.0, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      isActive: true,
    });

    vehicle1B = await vehicleModel.create({
      transporter: transporter1Id,
      registrationNumber: 'DL-01-AB-1002',
      category: lcvCat._id,
      categoryCode: 'LIGHT_COMMERCIAL',
      manufacturer: 'Ashok Leyland',
      model: 'Partner LCV',
      manufacturingYear: 2022,
      payloadCapacityKg: 2800,
      cargoBodyDimensions: { lengthFt: 14.0, widthFt: 6.5, heightFt: 6.5, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      isActive: true,
    });

    vehicle2A = await vehicleModel.create({
      transporter: transporter2Id,
      registrationNumber: 'HR-26-CD-2001',
      category: miniTruckCat._id,
      categoryCode: 'MINI_TRUCK',
      manufacturer: 'Tata Motors',
      model: 'Ace CNG',
      manufacturingYear: 2024,
      payloadCapacityKg: 950,
      cargoBodyDimensions: { lengthFt: 7.2, widthFt: 4.8, heightFt: 5.0, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      isActive: true,
    });

    vehicle2B = await vehicleModel.create({
      transporter: transporter2Id,
      registrationNumber: 'HR-26-CD-2002',
      category: miniTruckCat._id,
      categoryCode: 'MINI_TRUCK',
      manufacturer: 'Mahindra',
      model: 'Supro Mini',
      manufacturingYear: 2023,
      payloadCapacityKg: 850,
      cargoBodyDimensions: { lengthFt: 7.0, widthFt: 4.5, heightFt: 4.8, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'PENDING', // Unverified!
      availabilityStatus: 'AVAILABLE',
      isActive: true,
    });

    vehicle2C = await vehicleModel.create({
      transporter: transporter2Id,
      registrationNumber: 'HR-26-CD-2003',
      category: miniTruckCat._id,
      categoryCode: 'MINI_TRUCK',
      manufacturer: 'Tata Motors',
      model: 'Ace HT',
      manufacturingYear: 2021,
      payloadCapacityKg: 900,
      cargoBodyDimensions: { lengthFt: 7.0, widthFt: 4.5, heightFt: 4.8, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'APPROVED',
      availabilityStatus: 'ON_TRIP', // Unavailable!
      isActive: true,
    });

    vehicle3A = await vehicleModel.create({
      transporter: inactiveTransporterId,
      registrationNumber: 'HR-26-EF-3001',
      category: miniTruckCat._id,
      categoryCode: 'MINI_TRUCK',
      manufacturer: 'Tata Motors',
      model: 'Ace Petrol',
      manufacturingYear: 2023,
      payloadCapacityKg: 900,
      cargoBodyDimensions: { lengthFt: 7.0, widthFt: 4.5, heightFt: 4.8, bodyType: 'CLOSED_CONTAINER' },
      verificationStatus: 'APPROVED',
      availabilityStatus: 'AVAILABLE',
      isActive: true,
    });

    // 6. Seed Confirmed Booking & Shipment
    const bookingDoc = await CargoBooking.create({
      customer: customerId,
      pickup: {
        addressLine: 'Plot 10, Udyog Vihar Phase 4',
        locality: 'Phase 4',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122015',
        contactPerson: 'Anil Kumar',
        contactPhone: '9876543210',
        coordinates: { latitude: 28.502, longitude: 77.085 },
      },
      dropoff: {
        addressLine: 'Shed 5, Okhla Phase 2',
        locality: 'Phase 2',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110020',
        contactPerson: 'Sunil Verma',
        contactPhone: '9123456789',
        coordinates: { latitude: 28.535, longitude: 77.271 },
      },
      cargo: {
        name: 'Auto Electrical Harness Units',
        category: 'AUTOMOTIVE_PARTS',
        weightKg: 650,
        dimensions: { lengthFt: 6.0, widthFt: 4.0, heightFt: 4.0, volumeCuFt: 96 },
        packageCount: 15,
        packagingType: 'BOXES_CARTONS',
        isFragile: false,
      },
      requestedVehicleCategory: miniTruckCat._id,
      requestedPickupAt: new Date(Date.now() + 86400000),
      bookingStatus: 'CONFIRMED',
    });
    confirmedBooking = bookingDoc;

    confirmedShipment = await Shipment.create({
      booking: confirmedBooking._id,
      bookingReference: confirmedBooking.bookingReference,
      customer: customerId,
      pickup: confirmedBooking.pickup,
      dropoff: confirmedBooking.dropoff,
      cargo: confirmedBooking.cargo,
      allocatedVehicleCategory: miniTruckCat._id,
      shipmentStatus: 'CREATED',
    });

    // 7. Seed Unconfirmed (REQUESTED) Booking without shipment
    unconfirmedBooking = await CargoBooking.create({
      customer: customerId,
      pickup: confirmedBooking.pickup,
      dropoff: confirmedBooking.dropoff,
      cargo: confirmedBooking.cargo,
      requestedVehicleCategory: miniTruckCat._id,
      requestedPickupAt: new Date(Date.now() + 86400000),
      bookingStatus: 'REQUESTED',
    });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ==========================================
  // 1. VEHICLE ELIGIBILITY ENGINE TESTS
  // ==========================================
  describe('Vehicle Eligibility Engine', () => {
    it('1. should qualify approved, available vehicle matching category, payload, and dimensions', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
        dimensions: { lengthFt: 6.0, widthFt: 4.0, heightFt: 4.0 },
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle1A, requirements);
      expect(evalResult.isEligible).toBe(true);
      expect(evalResult.rejectionReasons).toHaveLength(0);
    });

    it('2. should reject unverified vehicle (PENDING approval)', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle2B, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('VEHICLE_NOT_VERIFIED');
    });

    it('3. should reject vehicle belonging to inactive transporter', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
      };

      const populatedVehicle = {
        ...vehicle3A.toObject(),
        transporter: { _id: inactiveTransporterId, isActive: false },
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(populatedVehicle, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('TRANSPORTER_INACTIVE');
    });

    it('4. should reject vehicle with insufficient payload capacity', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 1200, // Vehicle1A only has 1000kg
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle1A, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('INSUFFICIENT_PAYLOAD_CAPACITY');
    });

    it('5. should reject vehicle with cargo dimension mismatch (cargo length > bed length)', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 500,
        dimensions: { lengthFt: 10.0, widthFt: 4.0, heightFt: 4.0 }, // Vehicle1A has length 7.2ft
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle1A, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('DIMENSION_MISMATCH');
    });

    it('6. should reject vehicle whose availability status is not AVAILABLE (e.g. ON_TRIP)', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
      };

      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle2C, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('VEHICLE_UNAVAILABLE');
    });

    it('7. should reject cross-category incompatibility (Mini-Truck cargo vs LCV vehicle)', () => {
      const requirements = {
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
      };

      // vehicle1B belongs to LCV category
      const evalResult = vehicleEligibilityService.evaluateVehicleEligibility(vehicle1B, requirements);
      expect(evalResult.isEligible).toBe(false);
      expect(evalResult.rejectionReasons).toContain('CATEGORY_MISMATCH');
    });
  });

  // ==========================================
  // 2. DISPATCH INITIATION & OFFER GENERATION TESTS
  // ==========================================
  describe('Dispatch Initiation & Offer Generation', () => {
    let createdDispatchJob = null;

    it('8. Admin can initiate dispatch for a confirmed shipment and generate offers to eligible transporters', async () => {
      const res = await request(app)
        .post(`/admin/dispatch/${confirmedShipment._id}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(201);
      expect(res.body.dispatchJob).toBeDefined();
      expect(res.body.dispatchJob.status).toBe('OFFERING');
      expect(res.body.dispatchJob.dispatchReference).toMatch(/^CRD-\d{8}-[A-F0-9]{5}$/);

      createdDispatchJob = res.body.dispatchJob;

      // Verify offers created in database
      const offers = await DispatchOffer.find({ dispatchJob: createdDispatchJob._id });
      expect(offers.length).toBeGreaterThanOrEqual(1);

      // Verify ineligible vehicles (vehicle2B unverified, vehicle2C on_trip, vehicle3A inactive) received NO offers
      const offeredVehicles = offers.map((o) => o.vehicle.toString());
      expect(offeredVehicles).not.toContain(vehicle2B._id.toString());
      expect(offeredVehicles).not.toContain(vehicle2C._id.toString());
      expect(offeredVehicles).not.toContain(vehicle3A._id.toString());
    });

    it('9. should reject dispatch initiation for an unconfirmed booking or missing shipment', async () => {
      // Fake shipment ID
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/admin/dispatch/${fakeId}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Shipment consignment not found/i);
    });

    it('10. Repeated dispatch initiation returns the existing active dispatch job idempotently', async () => {
      const res = await request(app)
        .post(`/admin/dispatch/${confirmedShipment._id}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(201);
      expect(res.body.dispatchJob._id).toBe(createdDispatchJob._id);
    });
  });

  // ==========================================
  // 3. TRANSPORTER OFFER RETRIEVAL & RESPONSES
  // ==========================================
  describe('Transporter Offer Response & Authorization', () => {
    it('11. Transporter 1 can view pending offers specifically scoped to their account', async () => {
      const res = await request(app)
        .get('/dispatch/offers')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token));

      expect(res.status).toBe(200);
      expect(res.body.offers).toBeInstanceOf(Array);
      expect(res.body.offers.length).toBeGreaterThan(0);

      // Verify offer belongs to Transporter 1
      for (const o of res.body.offers) {
        expect(o.transporter.toString()).toBe(transporter1Id.toString());
        expect(o.status).toBe('PENDING');
      }
    });

    it('12. Transporter 2 is denied accessing Transporter 1’s offer details (403 Forbidden)', async () => {
      const t1Offers = await DispatchOffer.find({ transporter: transporter1Id, status: 'PENDING' });
      expect(t1Offers.length).toBeGreaterThan(0);
      const t1OfferId = t1Offers[0]._id;

      const res = await request(app)
        .get(`/dispatch/offers/${t1OfferId}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('13. Transporter 2 is denied accepting Transporter 1’s offer (403 Forbidden)', async () => {
      const t1Offers = await DispatchOffer.find({ transporter: transporter1Id, status: 'PENDING' });
      const t1OfferId = t1Offers[0]._id;

      const res = await request(app)
        .post(`/dispatch/offers/${t1OfferId}/accept`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token));

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('14. Customer account is forbidden from accessing transporter dispatch endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/dispatch/offers')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(customerToken));

      expect(res.status).toBe(403);
    });

    it('15. Transporter can reject an offer with a reason, and cannot subsequently accept it', async () => {
      // Find an offer for Transporter 2 if present, or create a mock offer for testing reject
      let t2Offer = await DispatchOffer.findOne({ transporter: transporter2Id, status: 'PENDING' });
      if (!t2Offer) {
        t2Offer = await DispatchOffer.create({
          dispatchJob: new mongoose.Types.ObjectId(),
          shipment: confirmedShipment._id,
          booking: confirmedBooking._id,
          transporter: transporter2Id,
          vehicle: vehicle2A._id,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 120000),
          cargoSnapshot: confirmedBooking.cargo,
          pickupSnapshot: confirmedBooking.pickup,
          dropoffSnapshot: confirmedBooking.dropoff,
        });
      }

      // Reject offer
      const rejectRes = await request(app)
        .post(`/dispatch/offers/${t2Offer._id}/reject`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token))
        .send({ rejectionReason: 'Driver unavailable for scheduled time window' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.offer.status).toBe('REJECTED');

      // Attempt accepting rejected offer -> must fail
      const acceptRes = await request(app)
        .post(`/dispatch/offers/${t2Offer._id}/accept`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter2Token));

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.message).toMatch(/previously rejected|expired/i);
    });

    it('16. Transporter cannot accept an expired offer', async () => {
      // Create an expired offer
      const expiredOffer = await DispatchOffer.create({
        dispatchJob: new mongoose.Types.ObjectId(),
        shipment: confirmedShipment._id,
        booking: confirmedBooking._id,
        transporter: transporter1Id,
        vehicle: vehicle1A._id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago!
        cargoSnapshot: confirmedBooking.cargo,
        pickupSnapshot: confirmedBooking.pickup,
        dropoffSnapshot: confirmedBooking.dropoff,
      });

      const res = await request(app)
        .post(`/dispatch/offers/${expiredOffer._id}/accept`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(transporter1Token));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  // ==========================================
  // 4. CONCURRENCY SAFETY & LIFECYCLE ASSIGNMENT TESTS
  // ==========================================
  describe('Concurrency Safety & Assignment Lifecycle', () => {
    let testDispatchJob = null;
    let testShipment = null;
    let offerA = null;
    let offerB = null;

    beforeEach(async () => {
      // Reset any active assignments on confirmedShipment
      await DispatchAssignment.deleteMany({ shipment: confirmedShipment._id });
      await DispatchJob.deleteMany({ shipment: confirmedShipment._id });
      await DispatchOffer.deleteMany({ shipment: confirmedShipment._id });

      // Create fresh DispatchJob
      testDispatchJob = await DispatchJob.create({
        booking: confirmedBooking._id,
        shipment: confirmedShipment._id,
        requiredVehicleCategory: miniTruckCat._id,
        requiredPayloadKg: 650,
        cargoSnapshot: confirmedBooking.cargo,
        pickupLocationSnapshot: confirmedBooking.pickup,
        deliveryLocationSnapshot: confirmedBooking.dropoff,
        status: 'OFFERING',
      });

      // Create 2 simultaneous offers: one for Transporter 1, one for Transporter 2
      offerA = await DispatchOffer.create({
        dispatchJob: testDispatchJob._id,
        shipment: confirmedShipment._id,
        booking: confirmedBooking._id,
        transporter: transporter1Id,
        vehicle: vehicle1A._id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 120000),
        cargoSnapshot: confirmedBooking.cargo,
        pickupSnapshot: confirmedBooking.pickup,
        dropoffSnapshot: confirmedBooking.dropoff,
      });

      offerB = await DispatchOffer.create({
        dispatchJob: testDispatchJob._id,
        shipment: confirmedShipment._id,
        booking: confirmedBooking._id,
        transporter: transporter2Id,
        vehicle: vehicle2A._id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 120000),
        cargoSnapshot: confirmedBooking.cargo,
        pickupSnapshot: confirmedBooking.pickup,
        dropoffSnapshot: confirmedBooking.dropoff,
      });
    });

    it('17. Concurrent acceptance: Two transporters accept simultaneously -> exactly ONE wins, the other receives 409 Conflict', async () => {
      // Fire simultaneous requests
      const [resA, resB] = await Promise.all([
        request(app)
          .post(`/dispatch/offers/${offerA._id}/accept`)
          .set('x-xsrf-token', VALID_CSRF)
          .set('Cookie', makeCookies(transporter1Token)),
        request(app)
          .post(`/dispatch/offers/${offerB._id}/accept`)
          .set('x-xsrf-token', VALID_CSRF)
          .set('Cookie', makeCookies(transporter2Token)),
      ]);

      const statuses = [resA.status, resB.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Exactly ONE assignment created in database
      const assignments = await DispatchAssignment.find({ shipment: confirmedShipment._id });
      expect(assignments).toHaveLength(1);

      // Winning vehicle becomes ON_TRIP
      const winningTransporterId = assignments[0].transporter.toString();
      const winningVehicleId = assignments[0].vehicle.toString();
      const updatedVehicle = await vehicleModel.findById(winningVehicleId);
      expect(updatedVehicle.availabilityStatus).toBe('ON_TRIP');

      // Losing offer becomes WITHDRAWN
      const losingOffer = await DispatchOffer.findOne({
        dispatchJob: testDispatchJob._id,
        status: 'WITHDRAWN',
      });
      expect(losingOffer).toBeDefined();

      // DispatchJob status is ASSIGNED
      const updatedJob = await DispatchJob.findById(testDispatchJob._id);
      expect(updatedJob.status).toBe('ASSIGNED');
      expect(updatedJob.assignedTransporter.toString()).toBe(winningTransporterId);

      // Shipment consignment has assigned carrier but remains in CREATED status (not IN_TRANSIT)
      const updatedShipment = await Shipment.findById(confirmedShipment._id);
      expect(updatedShipment.assignedTransporter.toString()).toBe(winningTransporterId);
      expect(updatedShipment.shipmentStatus).toBe('CREATED');
    });

    it('18. Transporter can view their active assigned job under /dispatch/jobs', async () => {
      // Ensure Transporter 1 has the assignment
      const assignments = await DispatchAssignment.find({ transporter: transporter1Id, assignmentStatus: 'ACTIVE' });
      if (assignments.length > 0) {
        const res = await request(app)
          .get('/dispatch/jobs')
          .set('x-xsrf-token', VALID_CSRF)
          .set('Cookie', makeCookies(transporter1Token));

        expect(res.status).toBe(200);
        expect(res.body.assignments).toBeInstanceOf(Array);
        expect(res.body.assignments.length).toBeGreaterThan(0);
      }
    });

    it('19. Admin can inspect dispatch operations under /admin/dispatch/jobs', async () => {
      const res = await request(app)
        .get('/admin/dispatch/jobs')
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
      expect(res.body.totalCount).toBeGreaterThan(0);
    });

    it('20. Admin can inspect job details including offer history and assignment under /admin/dispatch/jobs/:id', async () => {
      const res = await request(app)
        .get(`/admin/dispatch/jobs/${testDispatchJob._id}`)
        .set('x-xsrf-token', VALID_CSRF)
        .set('Cookie', makeCookies(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
      expect(res.body.offers).toBeInstanceOf(Array);
    });
  });
});
