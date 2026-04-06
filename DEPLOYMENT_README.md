# Zoro9X Website Deployment & Recovery Guide

**Server IP:** 206.189.91.82  
**Domain:** zoro9x.com / www.zoro9x.com  
**Date Deployed:** April 5, 2026  
**Status:** ✅ LIVE

---

## Quick Overview

| Component | Port | Status | Manager |
|-----------|------|--------|---------|
| Frontend (Vite Dev) | 4173 | ✅ Online | PM2 ID: 4 |
| Backend (Node.js) | 5001 | ✅ Online | PM2 ID: 0 |
| Nginx (HTTP/HTTPS) | 80/443 | ✅ Online | systemd |
| SSL Certificate | - | ✅ Valid | Let's Encrypt |

---

## Problem Solved

### Issue 1: Website Not Loading (500 Error)
**Root Cause:** Duplicate Nginx site configs (`zoro9x` and `zoro9x.bak.`) caused conflicting server blocks.  
**Solution:** Removed `zoro9x.bak.` and configured single Nginx site with proper proxy settings.

### Issue 2: Frontend Not Running Under PM2
**Root Cause:** Frontend was not started in PM2, causing only backend to be managed.  
**Solution:** Started frontend with `npm run dev` in PM2 as process ID 4.

### Issue 3: Vite HMR WebSocket Failures (403 Forbidden)
**Root Cause:** Vite dev server blocked requests from domain (only allowed localhost).  
**Solution:** 
- Updated `vite.config.ts` with `allowedHosts` whitelist
- Configured HMR to use secure WebSocket (wss://) through Nginx
- Added WebSocket upgrade headers in Nginx proxy config

---

## File Locations & Configurations

### 1. Vite Configuration
**File:** `/var/www/zoro9x/frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', 'zoro9x.com', 'www.zoro9x.com', '127.0.0.1'],
    hmr: {
      protocol: 'wss',
      host: 'www.zoro9x.com',
      port: 443,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['.git'],
  },
})
```

**Key Settings:**
- `allowedHosts`: Allows Vite to accept requests from domain and localhost
- `hmr.protocol: 'wss'`: Secure WebSocket for hot module replacement
- `hmr.host: 'www.zoro9x.com'`: Browser connects through domain for HMR

### 2. Nginx Configuration
**File:** `/etc/nginx/sites-enabled/zoro9x`

```nginx
server {
    listen 80;
    server_name zoro9x.com www.zoro9x.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name zoro9x.com www.zoro9x.com;

    ssl_certificate /etc/letsencrypt/live/zoro9x.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zoro9x.com/privkey.pem;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/zoro9x/backend/uploads/;
    }
}
```

**Critical Headers:**
- `Upgrade` & `Connection: upgrade` → Enable WebSocket proxying for HMR

---

## PM2 Process Management

### View All Processes
```bash
pm2 status
```

### Logs
```bash
# Frontend logs
pm2 logs zoro9x-frontend --lines 50

# Backend logs
pm2 logs zoro9x-backend --lines 50

# All logs
pm2 logs
```

### Restart Processes
```bash
# Restart frontend (if config changes)
pm2 restart zoro9x-frontend

# Restart backend
pm2 restart zoro9x-backend

# Restart all
pm2 restart all
```

### Stop/Start
```bash
# Stop specific process
pm2 stop zoro9x-frontend

# Start specific process
pm2 start zoro9x-frontend

# Delete (remove from PM2)
pm2 delete zoro9x-frontend
```

### Persist PM2 on Reboot
```bash
pm2 save
pm2 startup systemd -u root --hp /root
```

---

## Quick Health Checks

### Test Frontend
```bash
curl -k -I https://www.zoro9x.com/
```
Expected: `HTTP/2 200`

### Test Backend API
```bash
curl -I https://www.zoro9x.com/api/
```
Expected: `HTTP/2 200`

### Check Nginx
```bash
nginx -t
systemctl status nginx
```

### Check PM2
```bash
pm2 status
pm2 logs zoro9x-frontend --lines 5 --nostream
pm2 logs zoro9x-backend --lines 5 --nostream
```

---

## Common Issues & Fixes

### Issue: "WebSocket connection failed"
**Fix:**
```bash
# Update vite.config.ts with correct HMR settings (see above)
pm2 restart zoro9x-frontend
```

### Issue: "503 Bad Gateway"
**Fix:**
```bash
# Check if frontend is running
pm2 status

# Check logs
pm2 logs zoro9x-frontend

# Restart
pm2 restart zoro9x-frontend
```

### Issue: "Cannot GET /api/"
**Fix:**
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs zoro9x-backend

# Verify backend listening on 5001
ss -ltnp | grep 5001

# Restart
pm2 restart zoro9x-backend
```

### Issue: SSL Certificate Error
**Fix:**
```bash
# Verify certificate exists
ls -la /etc/letsencrypt/live/zoro9x.com/

# Test Nginx SSL
nginx -t

# If cert expired, renew with Certbot
sudo certbot renew
```

---

## Directory Structure

```
/var/www/zoro9x/
├── frontend/
│   ├── src/
│   ├── dist/                    (built files - for production)
│   ├── node_modules/
│   ├── package.json
│   ├── vite.config.ts          ✅ MODIFIED
│   └── index.html
├── backend/
│   ├── index.js                (entry point)
│   ├── .env                     (environment variables)
│   ├── node_modules/
│   ├── package.json
│   ├── routes/
│   ├── controllers/
│   └── uploads/                (user uploaded files)
└── license files, etc.
```

---

## Deployment Commands (Full Setup)

If you need to redeploy from scratch:

```bash
# SSH to server
ssh root@206.189.91.82

# Install dependencies (if not already done)
cd /var/www/zoro9x/frontend
npm install

cd /var/www/zoro9x/backend
npm install

# Delete old PM2 processes
pm2 delete all

# Start frontend in dev mode with PM2
cd /var/www/zoro9x/frontend
pm2 start npm --name zoro9x-frontend -- run dev -- --host 127.0.0.1 --port 4173

# Start backend with PM2
cd /var/www/zoro9x/backend
pm2 start index.js --name zoro9x-backend

# Save PM2 state
pm2 save
pm2 startup systemd -u root --hp /root

# Update Nginx config (copy from above)
# Then test and reload
nginx -t
systemctl reload nginx

# Verify
pm2 status
curl -k -I https://www.zoro9x.com/
```

---

## Environment Variables

### Backend (.env)
Located at: `/var/www/zoro9x/backend/.env`

Key variables:
```bash
PORT=5001
DATABASE_URL=...        (configured for your DB)
NODE_ENV=production
```

### Frontend
Located at: `/var/www/zoro9x/frontend/.env`

Check for API endpoint configuration (usually loaded from backend)

---

## Monitoring & Maintenance

### Weekly Checklist
```bash
pm2 status                          # Check all processes running
curl -k -I https://zoro9x.com/     # Test HTTPS
curl -k -I https://www.zoro9x.com/ # Test www subdomain
pm2 logs zoro9x-frontend --lines 50 # Check for errors
pm2 logs zoro9x-backend --lines 50  # Check backend health
```

### Monthly Tasks
```bash
# Check disk usage
df -h /var/www/zoro9x

# Check SSL cert expiration
openssl x509 -in /etc/letsencrypt/live/zoro9x.com/cert.pem -noout -dates

# Review error logs
tail -n 100 /var/log/nginx/error.log
```

---

## Manual Nginx Config Replacement (if needed)

```bash
# Create backup of current config
cp /etc/nginx/sites-enabled/zoro9x /etc/nginx/sites-enabled/zoro9x.backup

# Edit directly
nano /etc/nginx/sites-enabled/zoro9x

# Test after editing
nginx -t

# If OK, reload
systemctl reload nginx
```

---

## Restart Entire Stack

```bash
# Stop all PM2 processes
pm2 stop all

# Reload Nginx
systemctl reload nginx

# Wait 2 seconds
sleep 2

# Start all PM2 processes
pm2 start all

# Verify
pm2 status
```

---

## Contact & Support

If the site goes down:

1. **SSH to server:** `ssh root@206.189.91.82`
2. **Check PM2:** `pm2 status`
3. **Check Nginx:** `systemctl status nginx`
4. **Check logs:** `pm2 logs | tail -n 100`
5. **Restart:** `pm2 restart all && systemctl reload nginx`

---

## Version History

| Date | Change | Status |
|------|--------|--------|
| Apr 5, 2026 | Initial deployment - Fixed 500 errors, WebSocket issues | ✅ LIVE |
| - | - | - |

---

**Last Updated:** April 5, 2026  
**Deployed By:** System Recovery Agent  
**Status:** Production Ready
