# FIXES APPLIED - Subscription Management & PDF Export

## Issue 1: "Data truncated for column 'event_type'" - FIXED ✅

### Problem
When managing subscription actions (activate, deactivate, extend, etc.), the system was failing with:
```
Error: Data truncated for column 'event_type' at row 1
```

### Root Cause
- `manageSubscriptionAdmin()` in `saasController.js` line 2185 generates event types like: `admin_subscription_activate`, `admin_subscription_extend_days`, etc.
- But the `audit_logs` table's `event_type` column only defined 10 ENUM values
- Enum mismatch caused data truncation error

### Solution Applied
Updated `backend/config/saasSchema.js` to include the new event types in the ENUM:
```sql
event_type ENUM(
  'download',
  'activation_approved',
  'activation_pending',
  'activation_rejected',
  'revocation',
  'token_refresh',
  'validation_blocked',
  'policy_violation',
  'approval',
  'rejection',
  'admin_subscription_activate',
  'admin_subscription_deactivate',
  'admin_subscription_expire',
  'admin_subscription_extend_days',
  'admin_subscription_set_end_date',
  'admin_subscription_lifetime',
  'admin_subscription_set_activation'
)
```

### What You Need To Do

**Option A: Let new apps use the new schema (automatic)**
- New installations will automatically work with the updated schema
- No manual migration needed for new databases

**Option B: Update existing databases (recommended)**
Run the migration script to update your existing database:

```bash
cd backend
node -e "require('./migrations/add_admin_audit_events.js').updateAuditLogsEnum().then(() => console.log('Done')).catch(e => console.error(e))"
```

Or directly in MySQL:
```sql
ALTER TABLE audit_logs
MODIFY COLUMN event_type ENUM(
  'download',
  'activation_approved',
  'activation_pending',
  'activation_rejected',
  'revocation',
  'token_refresh',
  'validation_blocked',
  'policy_violation',
  'approval',
  'rejection',
  'admin_subscription_activate',
  'admin_subscription_deactivate',
  'admin_subscription_expire',
  'admin_subscription_extend_days',
  'admin_subscription_set_end_date',
  'admin_subscription_lifetime',
  'admin_subscription_set_activation'
) NOT NULL;
```

---

## Issue 2: "Cant save PDF after download system via server" - IMPROVED ✅

### Problem
- System downloaded to server/different machine fails to export PDFs
- Error: "Microsoft Edge not found for PDF export"
- No alternative or helpful guidance provided to users

### Root Cause
PDF export relies on Microsoft Edge headless mode, which:
1. Only available on Windows/macOS
2. Requires Edge to be installed on the system
3. Not available on Linux servers
4. No fallback mechanism provided

### Solution Applied

Enhanced `systems/gold_loan_management/basic/pages/print_ticket.py` with:

1. **Better Error Detection:**
   - Check multiple common Edge installation locations
   - Added support for Chrome as fallback (if present)
   - Added `--no-sandbox` flag for server environments

2. **Cross-Platform Support:**
   - Windows: `os.startfile(pdf_path)`
   - macOS: `subprocess.run(['open', pdf_path])`
   - Linux: `subprocess.run(['xdg-open', pdf_path])`

3. **Helpful Error Messages:**
   - If Edge not found, shows user-friendly message with alternatives
   - Directs users to Edge download link
   - Suggests using browser print-to-PDF as workaround
   - Shows where HTML preview is saved

4. **Robust Error Handling:**
   - Added timeout (30 seconds) for PDF generation
   - Validates PDF file was created and not empty
   - Captures stdout/stderr for debugging
   - Better subprocess error reporting

5. **Features:**
   ```python
   # New error message when Edge is missing:
   "Microsoft Edge is required for PDF export and is not currently installed.
   
   Options:
   1. Install Microsoft Edge from https://www.microsoft.com/en-us/edge/download
   2. Use 'Open Web Print Preview' button and print to PDF using your browser
   
   The HTML preview is saved in your Downloads folder and can be printed manually."
   ```

### What You Need To Do

**For Windows Systems (with Edge installed):**
- No changes needed - should work as before, with better error messages

**For Windows Systems (without Edge):**
- Option 1: Install Microsoft Edge
- Option 2: Use "🌐 Open Web Print Preview" button to print from browser

**For Linux/Server Environments:**
- The system will now show a clear message that Edge is required
- Recommend using browser print-to-PDF workflow instead
- Or install Chromium/Chrome and the code will attempt to use it

**For Docker/Container Deployments:**
If deploying to Docker and need PDF export:
- Install chromium or microsoft-edge in your container
- OR rely on browser-based printing workaround

### Testing the Fix

1. **Test Database Fix:**
   ```bash
   npm start
   # Try managing subscription actions in admin panel
   # Should no longer show truncation errors
   ```

2. **Test PDF Export:**
   - Click "💾 Save as PDF" button
   - If Edge installed: PDF saves and opens
   - If Edge not installed: Clear error message shown with alternatives

---

## Files Modified

1. `backend/config/saasSchema.js` - Updated audit_logs ENUM definition
2. `backend/migrations/add_admin_audit_events.js` - New migration script
3. `systems/gold_loan_management/basic/pages/print_ticket.py` - Enhanced PDF generation with better error handling and cross-platform support

## Next Steps

1. ✅ Apply database schema updates (run migration or create fresh DB)
2. ✅ Restart backend server: `npm start`
3. ✅ Test subscription management actions
4. ✅ Test PDF export with appropriate error handling

---

## Known Limitations

- PDF export on Linux requires Chromium/Chrome installation or browser-based printing
- Server deployments should configure for browser-based print workflow
- WebSocket/headless browser automation on remote servers may require additional setup

