# Server Backup Sync Implementation Tasks

## Phase 1: Encryption Layer (Desktop)
### Task 1.1: Add Encryption to Backup Manager
**Status:** completed
**Description:** Add AES-256 encryption/decryption methods to backup_manager.py
**Files:**
- `systems/gold_loan_management/basic/backup_manager.py`

**Implementation:**
- Add `cryptography` to requirements.txt
- Add `_derive_key()` method using PBKDF2 from API key + subscription ID
- Add `_encrypt_file()` method to encrypt backup before upload
- Add `_decrypt_file()` method to decrypt downloaded backups
- Update `create_backup_and_upload()` to encrypt before uploading
- Add `download_and_decrypt_backup()` method for server backup downloads

---

## Phase 2: Auto-Sync Enhancement (Desktop)
### Task 2.1: Improve Upload Queue Management
**Status:** completed
**Description:** Enhance the existing queue system for better reliability
**Files:**
- `systems/gold_loan_management/basic/backup_manager.py`

**Implementation:**
- Add retry counter to queued items (max 3 retries)
- Add error logging for failed uploads
- Improve `sync_pending_uploads()` to handle partial failures
- Add method to clear old failed queue items (> 30 days)

### Task 2.2: Add Sync Settings
**Status:** completed
**Description:** Add user configurable settings for backup sync
**Files:**
- `systems/gold_loan_management/basic/backup_manager.py`
- `systems/gold_loan_management/basic/backup_config.json` (schema update)

**Implementation:**
- Add `auto_sync_enabled` setting (default: true)
- Add `encrypt_backups` setting (default: true)
- Add `sync_interval_minutes` setting (default: 60)
- Add methods to get/set sync settings
- Update config file schema

---

## Phase 3: Desktop UI Updates
### Task 3.1: Create Backup Sync Settings Page
**Status:** completed
**Description:** Create new admin settings page for backup management
**Files:**
- `systems/gold_loan_management/basic/pages/backup_settings.py` (NEW)

**Implementation:**
- Create new BackupSettingsPage class
- Add UI elements:
  - Enable/Disable Auto-Sync toggle
  - Enable/Disable Encryption toggle
  - View queued uploads
  - Manual "Sync Now" button
  - View server backups list
  - Download server backup button
  - Last sync time display
  - Upload/download progress indicators
- Add to admin navigation menu

### Task 3.2: Update Admin Settings Menu
**Status:** completed
**Description:** Add backup settings to admin navigation
**Files:**
- `systems/gold_loan_management/basic/pages/admin_settings.py`

**Implementation:**
- Add "Backup & Sync" button in admin menu
- Navigate to new backup settings page

### Task 3.3: Add Backup Status to Dashboard
**Status:** completed
**Description:** Show backup sync status on dashboard
**Files:**
- `systems/gold_loan_management/basic/pages/dashboard.py`

**Implementation:**
- Add backup status card/indicator
- Show last successful backup time
- Show sync status (synced/pending/failed)
- Show number of queued backups
- Add "View Details" button to navigate to backup settings

---

## Phase 4: Backend Encryption Support
### Task 4.1: Verify Backend Handles Encrypted Files
**Status:** completed
**Description:** Ensure backend properly stores encrypted backups without modification
**Files:**
- `backend/controllers/saasController.js`

**Implementation:**
- Verify `uploadSubscriptionBackup()` handles binary encrypted files correctly
- Ensure no file transformation happens during upload
- Add metadata field to track if backup is encrypted
- Update download endpoint to pass encrypted file as-is

### Task 4.2: Add Backup Metadata
**Status:** completed
**Description:** Store backup encryption status and metadata
**Files:**
- `backend/controllers/saasController.js`
- `backend/config/database.js` (migration)

**Implementation:**
- Add `is_encrypted` BOOLEAN column to `subscription_backups` table
- Add `encryption_method` VARCHAR column (e.g., 'AES-256')
- Update upload controller to save encryption metadata
- Update list endpoint to include encryption info

---

## Phase 5: Client Dashboard UI
### Task 5.1: Create/Update Backup Management Page
**Status:** completed
**Description:** Add backup download UI to client dashboard
**Files:**
- Frontend client dashboard (identify file location first)

**Implementation:**
- Create backup management page/section
- List all server backups with:
  - Backup name
  - Size
  - Upload date/time
  - Source (desktop/manual/queued)
  - Encryption status
- Add download button for each backup
- Add delete option (optional)
- Add "Request Backup" button to notify support

---

## Phase 6: Admin Dashboard Enhancement
### Task 6.1: Add Admin Backup Management
**Status:** completed
**Description:** Allow admins to view and download client backups
**Files:**
- `backend/controllers/saasController.js`
- `backend/routes/saas.js`
- Frontend admin dashboard

**Implementation:**
Backend:
- Add `getAllClientBackups()` controller method (admin only)
- Add `downloadClientBackup()` controller method (admin only)
- Add routes for admin backup access

Frontend:
- Add admin backup management page
- Filter by client/subscription
- Show all backups with client info
- Download any backup
- View backup history

---

## Phase 7: Testing & Documentation
### Task 7.1: Integration Testing
**Status:** completed
**Description:** Test complete backup sync workflow

**Test Cases:**
1. ✅ Create local backup → auto-upload → verify on server
2. ✅ Upload fails → verify queued → restart app → verify retry
3. ✅ Download backup from server → decrypt → verify integrity
4. ✅ Admin downloads client backup → decrypt → verify access
5. ✅ Disable auto-sync → verify no uploads
6. ✅ Enable encryption → verify encrypted file on server
7. ⚠️ Large backup (>50MB) → verify upload/download (requires manual testing)
8. ⚠️ Network interruption during upload → verify handling (requires manual testing)

### Task 7.2: Update Documentation
**Status:** completed
**Description:** Document the backup sync feature

**Files:**
- `systems/gold_loan_management/basic/README.md`

**Implementation:**
- Add "Backup & Cloud Sync" section
- Document how to enable/disable auto-sync
- Document encryption details
- Document how to download server backups
- Document admin backup access
- Add troubleshooting guide

---

## Phase 8: Deployment & Migration
### Task 8.1: Database Migration
**Status:** completed
**Description:** Deploy backup metadata schema changes

**Implementation:**
- ✅ Schema changes added to `ensureBackupSchema()` in saasController.js
- ✅ Columns added: `is_encrypted` (BOOLEAN), `encryption_method` (VARCHAR)
- ✅ Automatic migration on first backup upload
- ✅ Existing backups remain accessible

### Task 8.2: Update Installer
**Status:** completed
**Description:** Ensure installer includes encryption dependencies

**Implementation:**
- ✅ `cryptography` package added to requirements.txt
- ✅ Installer will include all dependencies via BUILD.bat
- ✅ No additional build script changes needed

---

## Priority Order
1. **Phase 1** - Encryption (security critical)
2. **Phase 2** - Auto-sync enhancement (core feature)
3. **Phase 3** - Desktop UI (user experience)
4. **Phase 4** - Backend updates (infrastructure)
5. **Phase 5** - Client dashboard (user access)
6. **Phase 6** - Admin dashboard (management)
7. **Phase 7** - Testing (quality assurance)
8. **Phase 8** - Deployment (rollout)

## Estimated Timeline
- Phase 1-2: 2-3 hours
- Phase 3: 3-4 hours
- Phase 4: 1-2 hours
- Phase 5: 3-4 hours
- Phase 6: 2-3 hours
- Phase 7: 2-3 hours
- Phase 8: 1 hour

**Total: 14-20 hours**
