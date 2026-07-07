# Server Live Backup Sync System

## Overview
Implement a live backup synchronization system that automatically uploads encrypted backups from client desktop applications to the ZORO9X server. This enables clients to:
- Have automatic cloud backups synced in real-time
- Download encrypted backups from their client dashboard
- Admin can download backups for specific clients/systems

## Current State
- ✅ Local backup system exists with 2 locations (backup_manager.py)
- ✅ Backend has backup upload API endpoint (`/api/saas/subscriptions/:subscriptionId/backups/upload`)
- ✅ Backend has backup download API endpoint
- ✅ Backup queuing system exists (`backup_upload_queue.json`)
- ✅ Basic upload method in `backup_manager.py` (`_upload_backup_file`, `create_backup_and_upload`)

## Requirements

### Client-Side (Desktop Application)
1. **Automatic Live Sync**: When backup is created, automatically upload to server
2. **Queue Management**: If upload fails, queue for retry on next app start
3. **Encryption**: Backups should be encrypted before upload
4. **Progress Indicator**: Show upload progress to user
5. **Settings UI**: Allow users to enable/disable auto-sync
6. **Manual Backup UI**: Button to manually create and upload backup
7. **Download from Server**: Ability to download server backups to local

### Server-Side (Backend)
1. **Encrypted Storage**: Store backups in encrypted format
2. **Client Dashboard**: UI to view and download backups
3. **Admin Dashboard**: Admin can view and download any client's backups
4. **Storage Management**: Auto-delete old backups (keep last 50)
5. **Access Control**: Verify API key and subscription before allowing backup operations

## Technical Approach

### Encryption
- Use AES-256 encryption with password derived from API key + subscription ID
- Encrypt locally before upload
- Decrypt on download

### Upload Flow
1. User action triggers backup (manual or automatic)
2. Create local backup to configured locations
3. Encrypt backup file
4. Upload to server via API
5. If upload fails, add to queue
6. On next app start, retry queued uploads

### Download Flow
1. User views available server backups in UI
2. User selects backup to download
3. System downloads encrypted file from server
4. Decrypt locally
5. Save to configured backup location
6. Optionally restore from downloaded backup

## Files to Modify/Create

### Desktop Application (Python)
- `backup_manager.py` - Add encryption methods
- `pages/backup_sync_settings.py` - New UI for backup sync settings (NEW)
- `pages/admin_settings.py` - Add backup sync settings to admin menu
- `pages/dashboard.py` - Add backup status indicator
- `gold_loan_app.py` - Initialize sync on startup

### Backend (Node.js)
- `controllers/saasController.js` - Already has upload/download (verify encryption handling)
- `routes/saas.js` - Already has routes (verify)

### Frontend (Client Dashboard)
- Client dashboard backup page - NEW or existing page to be identified

## Success Criteria
- ✅ Backups automatically sync to server after each save
- ✅ Failed uploads queued and retried
- ✅ Backups encrypted at rest on server
- ✅ Clients can download their backups from dashboard
- ✅ Admins can download any client's backups
- ✅ UI shows sync status and last backup time
- ✅ Settings to enable/disable auto-sync
