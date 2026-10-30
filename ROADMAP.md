# CargoRide – 32-Commit Master Engineering Roadmap

```
PHASE 1: Foundation & Architecture (Commits 1 to 8)
├── [x] Commit 01: Repository hygiene, root .gitignore fix, and node_modules cleanup
├── [x] Commit 02: Dependency alignment (Socket.IO, Leaflet, Multer, Zod, testing libraries)
├── [x] Commit 03: Environment configuration, database pooling, and graceful shutdown
├── [x] Commit 04: Unified User & Transporter schema with Role-Based Access Control (RBAC)
├── [ ] Commit 05: Fix legacy backend bugs (user.service syntax, controller-wrapper alignment)
├── [ ] Commit 06: Commercial vehicle categories and vehicle fleet schemas with GeoJSON
├── [ ] Commit 07: Cargo specification and cloud storage service for documents & cargo photos
└── [ ] Commit 08: Socket.IO real-time server gateway initialization with authentication

PHASE 2: Customer Experience & Booking Lifecycle (Commits 9 to 17)
├── [ ] Commit 09: Frontend branding overhaul, typography, and CargoRide design system
├── [ ] Commit 10: Interactive map component using Leaflet with location selection
├── [ ] Commit 11: Real-time address autocomplete and geocoding integration
├── [ ] Commit 12: Commercial vehicle selection drawer with payload and bed dimensions
├── [ ] Commit 13: Cargo details specification form and condition photo upload UI
├── [ ] Commit 14: Dynamic pricing engine backend with Indian freight tariff algorithms
├── [ ] Commit 15: Booking state machine entity, validation schemas, and lifecycle routes
├── [ ] Commit 16: Customer live shipment tracking view with route polylines and ETA
└── [ ] Commit 17: Customer booking history, shipment details, and GST invoice download

PHASE 3: Transporter Experience & Dispatch Engine (Commits 18 to 25)
├── [ ] Commit 18: Transporter onboarding flow and commercial document upload portal
├── [ ] Commit 19: Transporter duty toggle and live location telemetry ping service
├── [ ] Commit 20: Geospatial matching engine and broadcast dispatch with timeout
├── [ ] Commit 21: Transporter dispatch popup with countdown timer and sound alerts
├── [ ] Commit 22: Pickup verification workflow with cryptographic OTP generation and validation
├── [ ] Commit 23: Delivery verification workflow with Delivery OTP and Proof-of-Delivery (POD)
├── [ ] Commit 24: Transporter active delivery dashboard with turn-by-turn waypoint cues
└── [ ] Commit 25: Transporter earnings ledger, trip history, and payout summary

PHASE 4: Admin Console, Payments & Production Hardening (Commits 26 to 32)
├── [ ] Commit 26: Razorpay & Cashfree payment gateway integration with webhook validation
├── [ ] Commit 27: Payment idempotency, wallet deduction, and transporter commission split
├── [ ] Commit 28: Admin authentication, role guards, and operational analytics dashboard
├── [ ] Commit 29: Admin transporter verification and vehicle compliance approval portal
├── [ ] Commit 30: Admin live fleet radar, active booking monitor, and dispute management
├── [ ] Commit 31: Comprehensive end-to-end test suite (Jest, Supertest, React Testing Library)
└── [ ] Commit 32: Production hardening, security headers (Helmet), rate limiting, and Docker setup
```
