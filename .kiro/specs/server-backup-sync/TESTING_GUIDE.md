# Backup Sync Testing Guide

## Current Status
All phases (1-8) are **COMPLETED**. The sync feature now includes proper error handling and retry mechanisms.

## Recent Fixes Applied
1. ✅ Error messages now show in popups (visible after install)
2. ✅ Added "Reset & Retry" button to Upload Queue card
3. ✅ Retry counts can be reset manually by users
4. ✅ Detailed error messages returned from upload attempts
5. ✅ Items with max retries stay in queue for manual retry

---

## Testing the Sync Feature

### Step 1: Verify Desktop App Setup
1. Open the desktop application
2. Navigate to **Admin Settings** → **Backup & Sync**
3. Check **Sync Status Card** shows:
   - API Key: `[configured]`
   - Subscription ID: `[number]`
   - Auto-Sync: Enabled/Disabled
   - Last Sync: `[timestamp]`

### Step 2: Create and Queue a Backup
1. In the **Backup & Sync** page, click **"Create Manual Backup"**
2. Backup should be created and queued automatically
3. Check **Upload Queue** card shows: `1 backup(s) queued for upload`

### Step 3: Test Sync Process
1. Click **"Process Queue"** button
2. You should see a popup: "Syncing backups to server..."
3. **One of two outcomes:**
   
   **A) Successful Upload:**
   - Popup shows: "Successfully synced 1 backup(s) to server!"
   - Queue count drops to 0
   - **Server Backups** card shows the new backup
   
   **B) Upload Failed:**
   - Popup shows specific error (e.g., "Cannot connect to server - check internet connection")
   - Queue count stays at 1
   - Retry count increases

### Step 4: If Upload Fails - Use Reset & Retry
1. If you see errors like "Max retries exceeded", click **"Reset & Retry"**
2. Confirm the dialog
3. You'll see: "Reset X queue item(s). Starting upload..."
4. Watch for error popup showing the actual problem:
   - Connection error → Check backend server is running
   - Authentication error → Check API key is valid
   - Server error → Check backend logs for details

### Step 5: Verify Backend is Running
If you get connection errors, verify backend:

```bash
cd backend
npm start
```

Backend should be running on `http://localhost:5000` (or configured URL)

### Step 6: Check Server Backups Display
1. After successful upload, check **Server Backups** card
2. Should show:
   - Backup name
   - File size
   - Upload timestamp
   - Encryption status
   - Source (desktop/queued)
   - **Download** button

### Step 7: Test Download from Server
1. Click **Download** on any server backup
2. Should see: "Downloading backup from server..."
3. Success popup shows download path
4. Backup appears in **Local Backups** card

---

## Web Dashboard Testing

### Client Dashboard
1. Login to web dashboard as a client
2. Navigate to **Subscriptions** → Select your subscription
3. Click **"Backups"** tab
4. Should see all server backups uploaded from desktop app
5. Click download to get the backup file

### Admin Dashboard
1. Login as admin
2. Navigate to **SaaS** → **Subscriptions** → Select subscription
3. Click **"Backups"** tab
4. Should see same backups
5. Admin can download any client's backups

---

## Common Issues & Solutions

### Issue 1: "Synced 0 backup(s)" despite queue items
**Solution:** Click **"Reset & Retry"** button to reset retry counts

### Issue 2: "Cannot connect to server"
**Solution:** 
- Check backend is running: `cd backend && npm start`
- Verify API URL in backup config matches backend
- Check firewall/network settings

### Issue 3: "Invalid API key"
**Solution:**
- Check subscription is active in database
- Verify API key matches subscription
- Check subscription_id in backup config

### Issue 4: "Max retries exceeded"
**Solution:**
- Click **"Reset & Retry"** to clear retry counts
- Read the error message in popup
- Fix underlying issue (connection/auth/server)
- Try sync again

### Issue 5: Encryption warning on startup
**Solution:**
- Run: `pip install cryptography`
- Restart application
- Encryption should work

### Issue 6: No backups showing in web dashboard
**Solution:**
- Check subscription ID matches
- Verify backups uploaded successfully (check server logs)
- Check `subscription_backups` table in database

---

## Database Verification

### Check Uploaded Backups
```sql
SELECT id, subscription_id, backup_name, file_size, is_encrypted, 
       encryption_method, source, uploaded_at 
FROM subscription_backups 
WHERE subscription_id = [YOUR_SUBSCRIPTION_ID]
ORDER BY uploaded_at DESC;
```

### Check Active Subscriptions
```sql
SELECT id, client_id, api_key, status, remote_database_name
FROM client_subscriptions
WHERE id = [YOUR_SUBSCRIPTION_ID];
```

---

## Files Modified in Final Fix

1. **systems/gold_loan_management/basic/pages/backup_settings.py**
   - Added "Reset & Retry" button to Upload Queue card (line ~485)
   - Added `_reset_and_retry_queue()` method (line ~608)
   - Resets retry counts and starts sync with confirmation dialog

2. **systems/gold_loan_management/basic/backup_manager.py**
   - Already had `reset_queue_retry_counts()` method
   - Already had error handling in sync methods
   - No changes needed

3. **backend/controllers/saasController.js**
   - Already properly configured
   - Upload endpoint handles encryption metadata
   - No changes needed

---

## Next Steps After Testing

1. **If sync works:** Feature is complete! 
2. **If errors occur:** Check error popup message and follow troubleshooting above
3. **For production:** Ensure backend is accessible from client networks
4. **Security:** Keep API keys secure, encrypted backups use AES-256-CBC

---

## Support Information

**Error Log Locations:**
- Desktop app: Console output (run from terminal to see logs)
- Backend: `backend/` directory console output
- Database: `subscription_backups` table

**Configuration Files:**
- Desktop: `backup_config.json` (in app data directory)
- Backend: `.env` file in backend directory

**Feature Documentation:**
- See: `systems/gold_loan_management/basic/README.md`
- Section: "Backup & Cloud Sync"
