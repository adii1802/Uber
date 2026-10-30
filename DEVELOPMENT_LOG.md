# CargoRide – Engineering Development Log

## Project Information
* **Product:** CargoRide (On-Demand Commercial Cargo & Logistics Platform - India)
* **Branch:** `feature/cargoride-platform`
* **Base Commit:** `ae9e0b1` (`user UI completed`)
* **Backup Reference:** `backup/pre-cargoride-head` (`ae9e0b1`)

## Database Configuration & Baseline Integrity
* **Engine:** MongoDB Community Server (v9.0.4) Running Locally as Windows Service (`MongoDB`)
* **Host & Port:** `127.0.0.1:27017`
* **Connection String Format:** `mongodb://127.0.0.1:27017/<database>`
* **Database Name:** Preserved existing database (`uber`)
* **Client Driver:** Mongoose `^8.19.3`
* **State & Integrity:** 
  * Local database verified active with `db.runCommand({ ping: 1 })` -> `{ ok: 1 }`.
  * Preserved local MongoDB configuration without cloud substitution.
  * Zero collections or documents dropped, reset, or modified.
  * Zero destructive migrations or seed scripts executed.
  * Connection architecture strictly preserved for Commit 02; resilience improvements scheduled for Commit 03.

---

## Log Entries

### [Commit 01] - Repository Hygiene, Git Safety & Project Preparation
* **Commit Hash:** `7753d91582483dfb27f80f3e4cffe61e729d5857` (`7753d91`)
* **Author:** Principal Software Architect & DevOps Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* **Git Safety & Isolation:**
  * Verified working tree integrity and identified 6 pre-existing modified files and 6 untracked components.
  * Created safety reference branch `backup/pre-cargoride-head` pointing at `ae9e0b1` before any modifications.
  * Created and checked out active development branch `feature/cargoride-platform`.
* **Root Gitignore Restoration:**
  * Renamed and replaced invalid root file `gitignore` (missing leading dot) with comprehensive `.gitignore`.
  * Added rules for `node_modules/`, `.env*` (except `!.env.example`), `dist/`, `build/`, `coverage/`, logs, OS artifacts, and IDE configs.
* **Tracked Node Modules Cleanup:**
  * Safely removed **3,144** tracked `backend/node_modules/` files from Git index cache via `git rm -r --cached`.
  * Verified local `backend/node_modules` remains on disk and dependencies are fully intact.
* **Environment Security:**
  * Identified that `backend/.env` and `frontend/.env` had previously been committed to Git in commit `ae9e0b1`.
  * Safely removed both `.env` files from Git tracking without deleting local files.
  * Created clean, sanitized `.env.example` templates for both `backend` and `frontend`.
* **Preservation of Existing Work:**
  * Guaranteed 100% preservation of all existing user modifications and untracked components.

#### 2. Validation & Quality Checks:
* `backend`: Executed `npm ls --depth=0` — all 9 core dependencies resolved cleanly without errors.
* `frontend`: Executed `npm run build` — Vite production bundle compiled cleanly in 50.98s (`119 modules transformed`).
* Verified MongoDB Community Server (v9.0.4) active service running and listening on `127.0.0.1:27017` with ping `{ ok: 1 }`.

#### 3. Remaining Issues for Subsequent Commits:
* Existing untracked components in `frontend/src/components/` and `frontend/src/pages/` contain syntax/prop bugs (`LookingForDriver.jsx` missing props, `CaptainDetails.jsx` hardcoded cards, etc.) to be refactored into the CargoRide modular architecture in Phase 2 & 3.
* Legacy backend bug in `user.service.js` (typo/reference error) and controller-wrapper contract mismatch to be fixed in Commit 05.

#### 4. Next Planned Action:
* **Commit 02:** Dependency Alignment & Modernization (`socket.io`, `leaflet`, `multer`, `zod`, testing libraries).

---

### [Checkpoint Commit] - Preserve Existing Captain & Ride UI Work
* **Commit Hash:** `ba6e95c4793bdf5c1b6973347c61717be547fbc8` (`ba6e95c`)
* **Author:** Principal Software Architect & DevOps Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* Committed all 12 pre-existing uncommitted files (6 modified files + 6 untracked components) from prior development into a dedicated checkpoint commit.
* Files committed:
  * Modified: `frontend/src/App.jsx`, `frontend/src/components/ConfirmRide.jsx`, `frontend/src/components/WaitingForDriver.jsx`, `frontend/src/pages/CaptainHome.jsx`, `frontend/src/pages/CaptainSignup.jsx`, `frontend/src/pages/Home.jsx`.
  * New Untracked Components: `frontend/src/components/CaptainDetails.jsx`, `frontend/src/components/ConfirmRidePopUp.jsx`, `frontend/src/components/FinishRide.jsx`, `frontend/src/components/RidePopUp.jsx`, `frontend/src/pages/CaptainRiding.jsx`, `frontend/src/pages/Riding.jsx`.
* Resulted in a 100% clean Git working directory while securing all development work in history.

---

### [Commit 02] - Dependency Alignment & Environment Modernization
* **Commit Hash:** `78c75ac411c5e9336423984ca9eb8589c3bc8e08` (`78c75ac`)
* **Author:** Principal Software Architect & DevOps Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* **Backend Production Infrastructure:**
  * Added `socket.io` (v4.8.4) for real-time WebSockets telemetry and dispatch.
  * Added `multer` (v2.5.0) for commercial document and cargo image uploads.
  * Added `zod` (v4.6.7) for schema validation.
  * Added `helmet` (v8.3.0) for HTTP security headers.
  * Added `express-rate-limit` (v8.7.2) for API abuse prevention.
  * Added `winston` (v3.19.0) and `morgan` (v1.12.1) for structured production and HTTP request logging.
  * Preserved `mongoose` at `^8.19.3` and all existing authentication/JWT libraries.
* **Backend Dev & Test Infrastructure:**
  * Added `jest` (v30.5.2) and `supertest` (v7.3.1).
  * Added npm scripts in `backend/package.json`: `"start": "node server.js"`, `"dev": "node --watch server.js"`, `"test": "jest --detectOpenHandles"`.
* **Frontend Real-Time & Mapping Infrastructure:**
  * Added `socket.io-client` (v4.8.4) for bidirectional communication with backend.
  * Added `leaflet` (v1.9.4) & `react-leaflet` (v5.0.0) for interactive map and route visualizer.
  * Added `lucide-react` (v1.65.0) for modern logistics UI icons alongside `remixicon`.
* **Database & Baseline Integrity:**
  * Existing local MongoDB configuration (`mongodb://127.0.0.1:27017/uber`) completely preserved and untouched.
  * Zero database migrations or destructive modifications executed.

#### 2. Validation & Quality Checks:
* `backend`: `npm ls --depth=0` returned 0 missing dependencies with all packages resolved cleanly.
* `frontend`: `npm run build` compiled the Vite production bundle in 4.67s without errors.
* Local MongoDB Server verified listening on `127.0.0.1:27017` with `{ ok: 1 }` ping.

#### 3. Remaining Issues for Subsequent Commits:
* Connection resilience, pool configuration, graceful shutdown, and server startup sequencing implemented in Commit 03.

#### 4. Next Planned Action:
* **Commit 03:** Environment Configuration, Database Pooling & Graceful Shutdown.

---

### [Commit 03] - Database Connection Reliability, Startup Lifecycle & Graceful Shutdown
* **Commit Hash:** `201dad7961ae01ea319a9d7010f3bcce0dfd1976` (`201dad7`)
* **Author:** Principal Software Architect & Backend Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* **Database Connection Resilience & Lifecycle (`backend/db/db.js`):**
  * Decoupled database connection from file imports to allow safe testing and deterministic startup.
  * Preserved local MongoDB database name `uber` on `mongodb://127.0.0.1:27017/uber`.
  * Configured connection pooling and timeout options with configurable environment variables:
    * `maxPoolSize`: 10 (configurable via `MONGO_MAX_POOL_SIZE`)
    * `minPoolSize`: 2 (configurable via `MONGO_MIN_POOL_SIZE`)
    * `serverSelectionTimeoutMS`: 5000ms (`MONGO_SERVER_SELECTION_TIMEOUT_MS`)
    * `socketTimeoutMS`: 45000ms (`MONGO_SOCKET_TIMEOUT_MS`)
    * `maxIdleTimeMS`: 30000ms (`MONGO_MAX_IDLE_TIME_MS`)
  * Implemented bounded exponential backoff for initial startup retries (`MONGO_MAX_RETRIES=5`, `MONGO_RETRY_DELAY_MS=1000`, max cap: 5000ms).
  * Implemented in-flight connection promise reuse to eliminate duplicate simultaneous connection attempts.
  * Added Mongoose lifecycle event listeners (`connected`, `disconnected`, `reconnected`, `error`) registered once to prevent listener leaks.
  * Implemented URI credential sanitization (`sanitizeMongoUri`) to prevent password leaks in application logs.
  * Implemented `getDatabaseHealth()` providing sanitized readiness and state telemetry.
* **Deterministic Server Startup Lifecycle (`backend/server.js`):**
  * Established strict sequencing: environment config -> Express app initialization -> MongoDB connection verification -> HTTP server listening.
  * Implemented controlled graceful shutdown sequence for `SIGINT` and `SIGTERM`:
    * Prevents multiple concurrent shutdown executions via `isShuttingDown` flag.
    * Closes HTTP server first to allow in-flight requests to complete while rejecting new connections.
    * Disconnects MongoDB cleanly after HTTP connections close.
    * Configurable shutdown timeout (`SHUTDOWN_TIMEOUT_MS=10000`) with unref'd timer to guarantee process termination.
  * Added process handlers for `uncaughtException` and `unhandledRejection` triggering graceful shutdown.
* **Modular Express Application (`backend/app.js`):**
  * Decoupled DB connection from app import.
  * Added HTTP security middleware with `helmet()` and CORS with credentials support.
  * Added HTTP request logging via `morgan` integrated with `winston` structured logger (`backend/utils/logger.js`).
  * Implemented safe `GET /health` endpoint reporting uptime and database health state (returns HTTP 200 when connected, 503 when disconnected).
  * Added standard 404 handler for unmatched routes and centralized error-handling middleware.
  * Preserved existing domain routes (`/users`, `/captains`) and backward-compatible root endpoint (`GET /`).
* **Environment Configuration (`backend/.env.example`):**
  * Documented all new lifecycle, database pool, and timeout configuration settings with safe defaults.
* **Automated Integration Test Suite (`backend/tests/health.test.js`):**
  * Verified `GET /health` returns HTTP 200 and `{ status: 'UP', database: { isConnected: true, status: 'connected', readyState: 1, name: 'uber' } }`.
  * Verified backward compatibility on `GET /` ('hellow world').
  * Verified 404 handler for unknown endpoints.
  * Verified connection state reporting and idempotency of `connectDB()`.

#### 2. Validation & Quality Checks:
* `backend`: Ran `npx jest tests/health.test.js --runInBand --forceExit` — 5/5 tests passed (100% pass rate).
* Local Server Smoke Test: Ran `node server.js` — verified startup logs, HTTP connection to `/health` (`UP`), `/` (`200 OK`), and clean shutdown.
* MongoDB Integrity: Local `uber` database intact on `127.0.0.1:27017` with zero collections dropped or modified.

#### 3. Next Planned Action:
* **Commit 04:** Unified User & Transporter schema with Role-Based Access Control (RBAC).

---

### [Commit 04] - Authentication Architecture, RBAC & Authorization Middleware
* **Commit Hash:** `bc1fde20ef77732d847aa1fa25d97f26fdbbc6f4` (`bc1fde2`)
* **Author:** Principal Software Architect & Backend Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* **Canonical Role Definitions (`backend/constants/roles.js`):**
  * Established canonical roles: `CUSTOMER`, `TRANSPORTER`, and `ADMIN`.
  * Enforced across database schemas, JWT token payloads, authorization middleware, and frontend guards.
* **Identity Architecture & Database Schemas:**
  * Preserved existing separate collections (`users`, `captains`) to guarantee zero data loss, eliminate duplicate identities, and prevent account collisions.
  * `User` (`backend/models/user.model.js`): Added immutable `role: 'CUSTOMER'`, `phone`, `isActive: Boolean (default: true)`, with updated JWT payload containing `id`, `_id`, `email`, and `role`.
  * `Captain` (`backend/models/captain.model.js`): Added immutable `role: 'TRANSPORTER'`, `phone`, `isActive: Boolean (default: true)`, normalized commercial vehicle types, with updated JWT payload.
  * `Admin` (`backend/models/admin.model.js`): Created dedicated administrative collection (`admins`) with role `'ADMIN'`, `isSuperAdmin`, `isActive`, and secure password hashing. Completely isolated from public registration.
* **Centralized Authentication Service (`backend/services/auth.service.js`):**
  * Consolidated bcrypt password hashing/comparison, JWT signing/verification, and account resolution by role and ID.
  * Integrated token revocation checking and blacklisting via `blacklistTokenModel`.
  * Configured standardized secure HTTP-only cookie options.
* **Reusable RBAC & Authorization Middleware (`backend/middlewares/auth.middleware.js`):**
  * `authenticateToken`: Validates JWT, verifies token is not revoked/blacklisted, confirms account is active (`isActive !== false`), attaches trusted identity to `req.auth`, `req.user`, and `req.account`.
  * `authorizeRoles(...roles)`: Enforces role permissions (returns 403 Forbidden on insufficient role).
  * `authorizeResourceOwner(getOwnerIdFn)`: Object-level authorization ensuring accounts can only access their own private resources unless an Admin.
  * Convenience guards: `requireCustomer`, `requireTransporter`, `requireAdmin`.
  * Backward compatibility aliases: `authUser`, `authCaptain`.
* **Controlled Administrative Bootstrap (`backend/controllers/admin.controller.js`):**
  * `POST /admin/bootstrap`: Initial administrative account setup protected by `x-admin-bootstrap-secret`. Permanently disabled once the initial admin account is created (`countDocuments() > 0`).
  * No public admin registration endpoint exists (returns 404).
  * Administrative dashboard metrics and user status toggle (`PATCH /admin/accounts/:id/status`).
* **Frontend Authentication Integration Fixes:**
  * Fixed `CaptainProtectWrapper.jsx` to resolve captain from either `response.data.captain` or direct `response.data`.
  * Fixed `UserLogout.jsx` and `CaptainLogout.jsx` to execute logout requests inside `useEffect` (instead of component body render) and clear state and localStorage.
  * Fixed vehicle type selection in `CaptainSignup.jsx` (aligned `'moto'` to `'motorcycle'` and added commercial cargo categories).
  * Added protected `/captain/logout` route in `frontend/src/App.jsx`.
* **Health Endpoint Privacy Correction (`backend/db/db.js` & `backend/app.js`):**
  * Removed internal database host (`host`) and database name (`name`) from public `GET /health` endpoint responses.
  * Verified response contains only high-level status (`status: 'UP'`, `isConnected: true`).

#### 2. Validation & Quality Checks:
* `backend`: Ran `npx jest tests/auth.test.js --runInBand --forceExit` — 24/24 tests passed (100% pass rate).
* `backend`: Ran `npx jest tests/health.test.js --runInBand --forceExit` — 5/5 tests passed (100% pass rate).
* `frontend`: Ran `npm run build` — compiled cleanly in 4.80s without errors.
* Database Isolation: Test suite ran against isolated `cargoride_test_auth` test database. Local `uber` database verified intact on `127.0.0.1:27017` with 0 dropped collections.

#### 3. Checkpoint Status:
* **Commit 04 Completed:** `bc1fde2` (with security hardening verification)

---

### Commit 05: Commercial Vehicle Categories & Transporter Fleet Management
* **Commit Hash:** `922baaa`
* **Author:** Principal Software Architect & Backend Lead
* **Date:** 2026-10-30

#### 1. Objectives & Changes Implemented:
* **Commercial Vehicle Categories Config & Schema (`backend/config/vehicleCategories.config.js`, `backend/models/vehicleCategory.model.js`):**
  * Seeded 6 standardized Indian commercial vehicle categories: 3-Wheeler Cargo, Mini Truck (Tata Ace), Pickup Truck (Bolero Pickup), Light Commercial Vehicle (LCV), Medium Commercial Vehicle (MCV), and Heavy Commercial Vehicle (HCV).
  * Enforced payload capacity (kg), deck dimensions (length, width, height in feet), cargo volume (cu.ft), and permit levels.
* **Transporter Fleet Management (`backend/models/vehicle.model.js`, `backend/services/vehicle.service.js`, `backend/controllers/vehicle.controller.js`):**
  * Dedicated multi-vehicle schema supporting transporter vehicle registration, registration number format validation (`^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$`), cargo body types, document references (RC, insurance, permit).
  * Transporter ownership enforcement, document verification workflows, and admin inspection endpoints.
* **Transporter Fleet UI (`frontend/src/pages/FleetManagement.jsx`):**
  * Built complete commercial fleet portal with vehicle listing, category specification badges, registration modals, and status badges.
  * Added navigation entry point from `CaptainHome.jsx` to `/captain/fleet`.

#### 2. Validation:
* `backend`: 25/25 vehicle fleet tests passed (`tests/vehicle.test.js`).
* `frontend`: Production build passed cleanly in 7.9s.

---

### Commit 06: Commercial Cargo Booking & Shipment Consignment Lifecycle
* **Commit Hash:** `19618f7`
* **Author:** Senior Backend Engineer & System Architect
* **Date:** 2026-10-31

#### 1. Objectives & Changes Implemented:
* **Structured Location Snapshot Schema (`backend/models/schemas/location.schema.js`):**
  * Reusable location subdocument with street address, locality, city, state, postal code (validated for 6-digit Indian PIN format `^[1-9][0-9]{5}$`), contact person, and contact phone (10-digit Indian mobile `^[6-9][0-9]{9}$`).
  * Latitude (-90 to 90) and Longitude (-180 to 180) boundary validation.
  * Preserved as immutable snapshots in bookings and physical shipment consignments.
* **Customer Cargo Booking Domain (`backend/models/cargoBooking.model.js`):**
  * Generated unique, human-readable booking reference (`CRB-YYYYMMDD-XXXXX`).
  * Cargo details: description, category, weight in kg (1 to 40,000 kg), package count, packaging type (cartons, crates, pallets, drums, sacks), fragile consignment flag, dimensions (length, width, height in ft) and volume calculation (cu. ft).
  * Vehicle category preference reference and requested pickup timestamp.
  * Booking lifecycle states: `REQUESTED`, `CONFIRMED`, `CANCELLED`, `EXPIRED`.
* **Physical Shipment Consignment Domain (`backend/models/shipment.model.js`):**
  * Represents physical freight consignment created only upon booking confirmation.
  * Unique shipment reference (`CRS-YYYYMMDD-XXXXX`).
  * Database-level 1:1 unique constraint on `{ booking: 1 }` ensuring exactly one shipment per booking.
  * Initial shipment status: `CREATED` (Consignment Manifest Initialized).
* **State Transition Engine & Concurrency Defense (`backend/services/bookingState.service.js`):**
  * Enforces state machine: `REQUESTED` -> `CONFIRMED`, `REQUESTED` -> `CANCELLED`, `REQUESTED` -> `EXPIRED`, `CONFIRMED` -> `CANCELLED`.
  * Protects against illegal transitions (`CANCELLED` -> `CONFIRMED`, `EXPIRED` -> `CONFIRMED`).
  * Evaluated MongoDB topology: standalone deployment (`setName: undefined`). Multi-document replica set transactions are unavailable; implemented optimistic concurrency control using atomic compare-and-swap (`findOneAndUpdate({ _id, bookingStatus: 'REQUESTED' })`) combined with unique database index on `shipment.booking` and compensation rollback on shipment creation failure.
* **Idempotency & Duplicate Submission Defense (`backend/models/idempotency.model.js`, `backend/services/booking.service.js`):**
  * Idempotency keys scoped to authenticated customer (`{ key: 1, customer: 1 }`).
  * SHA-256 payload fingerprinting: duplicate key with identical payload returns cached 201 response with `X-Cache-Lookup: HIT`; duplicate key with altered payload returns `409 Conflict`.
  * 24-hour TTL index for automated record cleanup.
* **REST APIs (`backend/routes/booking.routes.js`, `backend/routes/shipment.routes.js`, `backend/routes/admin.routes.js`):**
  * Customer: `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/cancel`, `GET /shipments`, `GET /shipments/:id`.
  * Admin: `GET /admin/bookings`, `GET /admin/bookings/:id`, `PATCH /admin/bookings/:id/status`, `GET /admin/shipments`.
  * RBAC and strict object-level authorization ensuring customers only access their own bookings and shipments.
* **Customer Frontend Booking & Tracking (`frontend/src/pages/BookCargo.jsx`, `frontend/src/pages/MyBookings.jsx`):**
  * 6-step progressive commercial booking form with dynamic vehicle category loading, dimension-to-volume calculator, field validation, and idempotency key generation.
  * Customer booking dashboard with status badges, full specification drawer, cancellation action, and shipment consignment tracking foundation (no fake GPS; carrier assignment notes for Commit 07).
  * Connected routes in `App.jsx` wrapped in `UserProtectWrapper` and updated `Home.jsx` navigation bar.

#### 2. Validation & Quality Checks:
* `backend`: Ran full test suite — 4/4 test suites passed, 74/74 tests passed (100% pass rate).
  * `tests/booking.test.js` (20/20 passed)
  * `tests/vehicle.test.js` (25/25 passed)
  * `tests/auth.test.js` (24/24 passed)
  * `tests/health.test.js` (5/5 passed)
* `frontend`: Ran `npm run build` — 123 modules transformed, compiled cleanly in 7.97s without errors.
* Local MongoDB Database: Untouched; test suites executed against isolated test databases.

#### 3. Checkpoint Status:
* **Commit 06 Completed:** `19618f7` (with documentation checkpoint `5340867`)

---

### Commit 07: Dispatch Engine & Transporter Job Assignment
* **Commit Hash:** `5e91a21`
* **Author:** Senior Distributed-Systems Engineer, Logistics Domain Architect & Production Backend Developer
* **Date:** 2026-10-31

#### 1. Objectives & Changes Implemented:
* **Dedicated Domain Models:**
  * `DispatchJob` (`backend/models/dispatchJob.model.js`): Manages the full dispatch operation for a shipment. Unique reference (`CRD-YYYYMMDD-XXXXX`), status state machine (`PENDING`, `OFFERING`, `ASSIGNED`, `EXHAUSTED`, `CANCELLED`), required vehicle category, payload & dimensions, immutable location snapshots, batch sizing, attempt counts, and complete operational audit trail. Unique constraint on `shipment` ensures exactly 1 active dispatch job per shipment.
  * `DispatchOffer` (`backend/models/dispatchOffer.model.js`): Represents job offers broadcasted to verified, eligible transporter vehicles. Unique reference (`CRO-YYYYMMDD-XXXXX`), status (`PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `WITHDRAWN`), server-enforced `expiresAt` expiration timestamp, acceptance/rejection metadata. Compound indexes prevent duplicate active offers for the same dispatch job and vehicle.
  * `DispatchAssignment` (`backend/models/dispatchAssignment.model.js`): Confirmed final assignment. Unique reference (`CRA-YYYYMMDD-XXXXX`), unique database constraint on `shipment` guaranteeing no shipment can ever have multiple active assignments, source tracking (`TRANSPORTER_ACCEPTED_OFFER`, `MANUAL_ADMIN_OVERRIDE`), and audit metadata.
* **Vehicle Eligibility Engine (`backend/services/vehicleEligibility.service.js`):**
  * Evaluates vehicle readiness against multi-dimensional commercial criteria: transporter active (`transporter.isActive === true`), vehicle active (`vehicle.isActive === true`), verification approved (`vehicle.verificationStatus === 'APPROVED'`), vehicle available (`vehicle.availabilityStatus === 'AVAILABLE'`), category compatibility, payload sufficiency, cargo dimensions fit, and special handling capabilities.
  * Emits clear, diagnostic rejection codes: `TRANSPORTER_INACTIVE`, `VEHICLE_INACTIVE`, `VEHICLE_NOT_VERIFIED`, `VEHICLE_UNAVAILABLE`, `INSUFFICIENT_PAYLOAD_CAPACITY`, `DIMENSION_MISMATCH`, `CATEGORY_MISMATCH`, `HANDLING_INCAPABLE`.
* **Proximity & Operational Ranking Engine (`backend/services/dispatchRanking.service.js`):**
  * Haversine formula calculation when genuine coordinates exist for both pickup location and transporter.
  * Deterministic operational ranking: Capacity fit factor (minimizing excess payload capacity wastage) and stable tie-breaking when coordinates are absent. No fabricated distance data.
* **Concurrency Safety & Atomic Offer Acceptance (`backend/services/dispatch.service.js`):**
  * Evaluated MongoDB topology: standalone deployment (`setName: undefined`). Multi-document replica set transactions are unavailable.
  * Concurrency guaranteed via:
    1. Atomic offer CAS: `DispatchOffer.findOneAndUpdate({ _id, transporter, status: 'PENDING', expiresAt: { $gt: now } }, { $set: { status: 'ACCEPTED' } })`.
    2. Atomic dispatch job CAS: `DispatchJob.findOneAndUpdate({ _id, status: { $in: ['PENDING', 'OFFERING'] } }, { $set: { status: 'ASSIGNED', assignedTransporter, assignedVehicle } })`. If another transporter accepted first, offer is immediately reverted to `WITHDRAWN` and `409 Conflict` is returned.
    3. Database-level unique constraint on `DispatchAssignment.shipment` (code 11000 rollback protection).
    4. Post-assignment updates: `Shipment` records assigned carrier and vehicle (remains in `CREATED` status without prematurely setting `IN_TRANSIT`); `Vehicle` availability marked `ON_TRIP`; all remaining pending offers for the job atomically set to `WITHDRAWN`.
* **Transporter & Admin REST APIs (`backend/routes/dispatch.routes.js`, `backend/routes/admin.routes.js`):**
  * Transporter: `GET /dispatch/offers`, `GET /dispatch/offers/:id`, `POST /dispatch/offers/:id/accept`, `POST /dispatch/offers/:id/reject`, `GET /dispatch/jobs`, `GET /dispatch/jobs/:id`.
  * Admin Operations: `POST /admin/dispatch/:shipmentId`, `GET /admin/dispatch/jobs`, `GET /admin/dispatch/jobs/:id`, `POST /admin/dispatch/jobs/:id/retry`, `POST /admin/dispatch/jobs/:id/cancel`.
* **Frontend Transporter & Admin Experience:**
  * `JobOffers.jsx` (`/captain/offers`): Live countdown timer component calculating remaining seconds until `expiresAt`, responsive freight specification cards, Accept & Reject actions with loading and error states.
  * `AssignedJobs.jsx` (`/captain/assigned-jobs`): Active and historical assigned consignments, target fleet vehicle cards, route information, and operational guidance.
  * `AdminDispatch.jsx` (`/admin/dispatch`): Operations console for monitoring dispatch jobs, broadcast offer history, retry exhausted attempts, and cancel dispatch operations.
  * Updated `CaptainHome.jsx` with direct navigation buttons to "Job Offers", "Assigned Freight", and "Fleet".

#### 2. Validation & Quality Checks:
* `backend`: Ran full test suite — 5/5 test suites passed, 94/94 tests passed (100% pass rate).
  * `tests/dispatch.test.js` (20/20 passed)
  * `tests/booking.test.js` (20/20 passed)
  * `tests/vehicle.test.js` (25/25 passed)
  * `tests/auth.test.js` (24/24 passed)
  * `tests/health.test.js` (5/5 passed)
* `frontend`: Ran `npm run build` — 126 modules transformed, compiled cleanly in 6.53s without errors.
* Local MongoDB Database: Untouched; test suites executed against isolated test databases.

#### 3. Next Planned Action:
* **Commit 08:** Socket.IO Real-Time Server Gateway Initialization with Authentication.



