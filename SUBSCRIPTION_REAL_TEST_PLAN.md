# Subscription Real-World Test Plan (Gold Loan)

This plan validates:
- 7-day offline grace in production
- 3-day renewal countdown in dashboard
- expired -> renew popup flow
- immediate activation after web renewal approval
- fast QA mode (5 minutes) without changing production logic

## 1. Production Defaults

Backend defaults (if no env overrides):
- Offline grace: 7 days
- Token TTL: at least offline grace

Desktop app defaults (if no local overrides):
- Offline grace: 7 days

## 2. Fast QA Mode (5-Minute Simulation)

Use this only in staging/local.

### Backend env
Set:
- OFFLINE_GRACE_MINUTES=5
- OFFLINE_TOKEN_TTL_MINUTES=5
- ONLINE_HEARTBEAT_WINDOW_MINUTES=1

Leave OFFLINE_GRACE_DAYS unset during fast QA.

### Desktop app env (same machine where app runs)
Set:
- ZORO9X_OFFLINE_GRACE_MINUTES=5

Leave ZORO9X_OFFLINE_GRACE_DAYS unset during fast QA.

## 3. Core Test Cases

### A) Offline grace works (allowed for grace window)
1. Start app online and login once (creates fresh signed cache/token).
2. Disconnect internet.
3. Reopen app within 5 minutes (QA mode) or within 7 days (production).
4. Expected:
   - App opens.
   - Offline mode warning appears.
   - No forced lock yet.

### B) Offline grace expiry lock
1. Keep app offline beyond grace window (5+ minutes in QA mode).
2. Reopen app.
3. Expected:
   - Access blocked.
   - Renewal/connect message shown.

### C) 3-day renewal countdown (day-based)
1. Set subscription end date to 3 days from now (admin manage action or DB).
2. Open client dashboard.
3. Expected:
   - Countdown banner shown in days (not hh:mm:ss).
   - "Renew Now" button opens renewal page.
4. Renew early while still >0 days remaining.
5. Expected:
   - After approval and refresh, countdown banner disappears.

### D) Expired popup flow
1. Set subscription end date to yesterday.
2. Open client dashboard.
3. Expected:
   - Expired popup appears.
   - "Renew Now" takes user to renewal flow.

### E) Immediate activation after web renewal approval
1. Make subscription expired and confirm app blocks.
2. Submit renewal in web client dashboard.
3. Admin approves renewal request.
4. Reopen app with internet.
5. Expected:
   - App validates as active immediately.
   - No stale expired state.

## 4. Suggested API Spot-Checks

Use API key + device fingerprint:
- POST /api/saas/validate-key
- POST /api/saas/heartbeat

Expected on validate success:
- valid=true
- grace_period_days / grace_period_minutes returned
- subscription_status=active
- token refreshed

## 5. Rollback to Production

After QA:
1. Remove OFFLINE_GRACE_MINUTES and OFFLINE_TOKEN_TTL_MINUTES test overrides.
2. Ensure OFFLINE_GRACE_DAYS is 7 (or desired production value).
3. Remove ZORO9X_OFFLINE_GRACE_MINUTES on client machines.

## 6. Optional Plan Flexibility (No Rebuild)

Without rebuilding desktop app, use web/admin controls:
- Extend days (e.g., +30, +60)
- Set exact end date
- Lifetime mode (end date set to 2099-12-31)

This allows per-client subscription duration changes from web only.
