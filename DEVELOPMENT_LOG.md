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

#### 3. Next Planned Action:
* **Commit 05:** Fix legacy backend bugs (user.service syntax, controller-wrapper alignment).

