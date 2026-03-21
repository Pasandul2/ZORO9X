# ZORO9X SaaS System - Current Implementation and Flow

Document date: 2026-03-14
Scope: Current implemented behavior in backend, frontend, generator, desktop app licensing, installer flow, and recommended next implementation steps.

## 1. System Overview

ZORO9X is a SaaS platform for selling and controlling desktop Python systems (for example, Gold Loan, Gym, Restaurant variants) using:
- Web marketplace and client portal (React)
- Admin control panel (React)
- API backend (Node.js + Express)
- Central platform database (MySQL)
- Generated/installed desktop applications (Python + SQLite)

Main operating model:
1. Admin creates or auto-generates a system and plans.
2. User registers and subscribes to a plan.
3. User downloads either standard installer or customized prefilled installer.
4. Desktop app validates API key and device against backend.
5. Backend enforces subscription/payment/device policies and logs activity.

## 2. High-Level Architecture

## 2.1 Web Layer
- Public pages, auth, marketplace, plan purchase, client dashboard.
- Admin pages for users/admins, SaaS systems/plans, security, audit, generator.

## 2.2 API Layer
- Auth endpoints for user registration/login/email verification/reset.
- SaaS endpoints for systems/plans/subscriptions/download/security.
- Admin endpoints for system generation and management.
- Device activation and key validation endpoints used by desktop apps.
- Optional data sync endpoints for remote backup database.

## 2.3 Data Layer
- MySQL: platform and control-plane data.
- SQLite (per installed client app): operational business data locally.
- Optional MySQL remote database per subscription for sync/backup.

## 3. Roles and Core Journeys

## 3.1 Admin Journey
1. Login via admin auth.
2. Create systems manually or via generator (basic + premium output).
3. Define and manage plans.
4. Monitor clients and subscriptions.
5. Approve/reject/revoke devices.
6. Resolve security alerts.
7. Review audit trail events.

## 3.2 User Journey
1. Register account.
2. Verify email via code.
3. Login.
4. Browse marketplace and system plans.
5. Purchase subscription.
6. Open client dashboard:
   - View API key/subscription details
   - View security and active devices
   - Download installer package

## 3.3 Desktop App Journey
1. Read local config and decrypt API key if encrypted.
2. Build machine fingerprint and MAC metadata.
3. Call validate-key.
4. If not activated, call activate-device.
5. Cache signed token and policy metadata locally.
6. Continue operation with online checks and controlled offline grace.

## 4. Current API Surface (Implemented)

## 4.1 Public SaaS Marketplace
- GET /api/saas/systems
- GET /api/saas/systems/:id
- GET /api/saas/systems/:systemId/plans

## 4.2 User-Protected SaaS
- POST /api/saas/subscribe
- GET /api/saas/my-subscriptions
- GET /api/saas/subscriptions/:id
- PUT /api/saas/subscriptions/:id/cancel
- GET /api/saas/subscriptions/:subscriptionId/usage
- GET /api/saas/subscriptions/:subscriptionId/security
- GET /api/saas/subscriptions/:subscriptionId/devices
- GET /api/saas/download/:subscriptionId
- POST /api/saas/generate-custom-system

## 4.3 Device + License Endpoints (Desktop App)
- POST /api/saas/activate-device
- POST /api/saas/validate-key

## 4.4 Admin SaaS
- GET /api/saas/admin/dashboard
- GET /api/saas/admin/clients
- POST /api/saas/admin/systems
- PUT /api/saas/admin/systems/:id
- DELETE /api/saas/admin/systems/:id
- POST /api/saas/admin/plans
- PUT /api/saas/admin/plans/:id
- DELETE /api/saas/admin/plans/:id

## 4.5 Admin Security + Audit
- GET /api/saas/admin/security/alerts
- GET /api/saas/admin/security/devices
- POST /api/saas/admin/security/devices/:id/approve
- POST /api/saas/admin/security/devices/:id/reject
- POST /api/saas/admin/security/devices/:id/revoke
- POST /api/saas/admin/security/alerts/:id/resolve
- GET /api/saas/admin/security/subscriptions/:id/devices
- GET /api/saas/admin/audit-logs

## 4.6 Sync APIs (API key based)
- POST /api/saas/sync/to-server
- POST /api/saas/sync/from-server
- GET /api/saas/sync/tables

## 5. Database Design and Data Behavior

## 5.1 Core Platform Tables
Implemented in schema modules:
- users
- admins
- systems
- subscription_plans
- clients
- client_subscriptions
- payments
- api_usage_logs
- system_notifications

## 5.2 Security and Licensing Tables
- device_activations:
  - status lifecycle: pending, active, rejected, revoked
  - unique by subscription_id + device_fingerprint
  - last_seen and ip tracking
- security_alerts:
  - types: concurrent_use, device_limit_exceeded, suspicious_location, rapid_activations
  - severity, review lifecycle, admin resolution metadata
- license_tokens:
  - token bound to subscription and device fingerprint
  - expiry tracking
- audit_logs:
  - normalized audit trail for download, activation states, revocation, token refresh, validation blocks, approval/rejection actions

## 5.3 Local Desktop Database
- SQLite database per installation (file-based on client machine).
- Business tables are generated per system template.
- License/cache/config files are separate from SQLite data.

## 6. Admin System Generation Flow

Current generator behavior:
1. Admin submits system metadata + features + table schema (+ optional icon upload).
2. Backend validates required fields and uniqueness (category).
3. Backend creates folder structure:
   - systems/{category}_management/basic
   - systems/{category}_management/premium
4. Generates Python app code for both tiers using template engine.
5. Generates installer.py for both tiers.
6. Generates requirements, specs, build scripts, README.
7. Inserts system record in MySQL.
8. Inserts default Basic/Premium plans.

Generated artifacts per tier include:
- {category}_app.py
- installer.py
- requirements.txt
- README.md
- app.spec
- installer.spec
- BUILD.bat

## 7. Marketplace and Subscription Flow

## 7.1 Marketplace
- Frontend loads active systems.
- User navigates to plans page for a selected system.

## 7.2 Purchase Wizard (Frontend)
3-step dialog currently collects:
- company_name
- contact_email
- contact_phone
- business_address
- website
- tax_id

Behavior note:
- Backend purchase endpoint currently persists core fields used in subscription/client creation and ignores extra fields not mapped.

## 7.3 Subscription Creation (Backend)
- Creates/reuses client record by user_id.
- Creates client_subscriptions row with generated api_key, database_name, subdomain, plan and period.
- Creates payment row (currently completed by default in flow).
- Creates welcome notification.

## 8. Installer Package Modes (Current)

## 8.1 Standard Installer (Direct Mode)
- User clicks direct download in client dashboard.
- Backend finds/builds installer EXE from subscribed system tier.
- Download is logged in api_usage_logs and audit_logs.
- Installer asks for configuration inputs during installation.

## 8.2 Customized Prefilled Installer
- User provides business details/logo in client dashboard dialog.
- Backend clones system files to temp folder.
- Writes business_config.json with prefilled details (including API key for setup context).
- Builds/fetches installer and returns downloadable package.
- Download is logged in api_usage_logs and audit_logs.

## 9. Device Activation and Validation Flow

## 9.1 Activation
- Desktop app sends api_key + device_fingerprint + device_info.
- Backend verifies active subscription.
- Existing device outcomes:
  - active: returns token
  - pending: 202 pending
  - rejected: blocked
- New device outcomes:
  - first active device auto-approved
  - additional devices enter pending and require admin action
  - over max_activations blocked with security alert

## 9.2 Validation
- validate-key checks:
  1. API key exists and subscription active.
  2. Recent payment state allows usage.
  3. Device exists and status is active.
  4. Updates device last_seen/ip.
  5. Logs usage and issues token.
  6. Returns grace_period_days policy.

## 9.3 Anti-Sharing/Abuse Controls
Implemented hard blocks:
- Concurrent distinct devices > threshold in short window.
- Rapid IP switching for same device.
- Impossible travel heuristic via fast major IPv4 prefix jump.

Each block:
- Creates security_alerts row.
- Creates audit_logs row with validation_blocked reason.
- Returns 429 with explanatory message.

## 10. Security Features Implemented

## 10.1 At-Rest API Key Protection
- Installer writes api_key_encrypted (not raw api_key) to app config.
- Encryption key is machine-tied via device fingerprint derivation.
- App decrypts at runtime on same machine.

## 10.2 Token and Cache Hardening
- Token includes subscription_id and device fingerprint binding.
- Local cache is signed with machine/API-material-based signature.
- Offline mode rejects tampered cache, wrong device, wrong subscription, expired token.

## 10.3 Offline Grace Policy
- Server returns grace_period_days.
- Desktop app stores grace_period_days in cache.
- Offline validity uses cached policy (fallback default if absent).

## 10.4 Device Governance
- Approve/reject/revoke operations in admin dashboard.
- Device table shows fingerprint, last_seen, ip, status.
- Client dashboard shows active devices including MAC where available.

## 10.5 Audit Trail
Current event classes include:
- download
- activation_approved
- activation_pending
- approval
- rejection
- revocation
- token_refresh
- validation_blocked

## 11. Installation Wizard - Full Step Process and Data Behavior

Wizard steps (6):
1. Welcome
2. License Agreement
3. Configuration
4. Installation Location
5. Installing
6. Completion

## 11.1 Step 1 - Welcome
- Shows summary and basic capabilities.
- Back disabled.

## 11.2 Step 2 - License Agreement
- Scrollable license text.
- User proceeds via I Agree.

## 11.3 Step 3 - Configuration Form
Collected fields:
- Company Name (required)
- Database Name (required)
- API Key (required, masked)

Behavior:
- Performs server validation of API key before allowing next step.
- Shows inline status and blocking popup on failure.

## 11.4 Step 4 - Install Location Form
Collected controls:
- Install path text + Browse dialog
- Create desktop shortcut checkbox

Behavior:
- Stores path/shortcut preference in wizard state.

## 11.5 Step 5 - Installing Process
Pre-check behavior:
- Re-validates API key with network requirement.
- If offline/invalid, user is returned to configuration step.

Execution sequence:
1. Create installation directory
2. Copy app binaries/scripts
3. Copy branding assets and business config
4. Write encrypted app config (api_key_encrypted)
5. Create desktop shortcut (Windows)

Failure behavior:
- Shows blocking error and exits wizard.

## 11.6 Step 6 - Completion
- Shows success and install path.
- Launch button starts installed app.

## 12. Current Form Inventory and Behavior Summary

## 12.1 User Registration/Auth Forms
- Register: email, password, fullName, phone
- Verify email: email + code
- Login: email + password
- Forgot password: email
- Reset password: email + code + newPassword

Behavior:
- Email verification is mandatory before login.
- Reset and verification codes are time-bound.

## 12.2 Marketplace Purchase Form
- Multi-step UX collects company and business fields.
- Backend currently uses core subscription fields and does not yet persist all extended business metadata from this form.

## 12.3 Client Installer Forms
- Split into standard download and customized prefilled generation paths.

## 12.4 Admin Security Forms
- Device approve/reject/revoke actions with reason where applicable.
- Alert resolution actions.
- Audit filter by event type.

## 13. Known Current Constraints / Behavior Gaps

1. Some purchase dialog fields are not fully persisted in backend client data model.
2. API key validation endpoint is publicly callable by design for desktop clients; no additional request signature beyond key/device data.
3. Sync endpoints rely on API key access model and would benefit from stronger request integrity controls.
4. A few documentation files in repository are older than current security/audit implementation.

## 14. What Should Be Implemented Next (Recommended)

Priority 1 - Security and Integrity
1. Add request signing/nonces for desktop API calls (activate/validate/sync).
2. Add key rotation and versioned token signing secrets.
3. Add brute-force/rate-limiting per API key and per IP on activation/validation routes.
4. Encrypt sensitive fields in business_config for customized packages (or remove raw key from that artifact and use one-time bootstrap token).

Priority 2 - Data Model Completeness
1. Persist full purchase/business form fields (address, website, tax_id, logo metadata) into normalized tables.
2. Add explicit subscription_policy table to store grace period, max devices, anomaly thresholds per plan/customer.
3. Add migration/version tracking table for generated system schema evolution.

Priority 3 - Operations and Audit
1. Add downloadable audit exports (CSV/JSON) and date-range filters.
2. Add immutable audit retention policy and archival process.
3. Add admin dashboard widgets for blocked validations and top risky subscriptions.

Priority 4 - Installer and Client Runtime
1. Add installer digital signature verification pipeline for production builds.
2. Add auto-update channel with signed update manifests.
3. Add installer rollback/repair mode.
4. Add localized error codes for support troubleshooting.

Priority 5 - Product UX
1. Add client self-service device session management (revoke own old devices).
2. Add payment gateway integration replacing hardcoded completed flow.
3. Add subscription renewal automation and dunning states.

## 15. Suggested Next Milestone Plan

Milestone A: Security Hardening Sprint
- Request signing, anti-replay nonce store, API rate limits, stronger sync auth.

Milestone B: Commercial Readiness Sprint
- Real payment integration, full billing states, renewal/expiry workflows, invoice/receipt events.

Milestone C: Platform Reliability Sprint
- Audit export, alerting rules tuning UI, backup/restore verification jobs, admin operational dashboards.

---

This document reflects current implemented behavior as observed in the active codebase as of 2026-03-14.