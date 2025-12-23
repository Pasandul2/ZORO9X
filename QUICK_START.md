# Quick Start Guide - Advanced SaaS Features

## Prerequisites
✅ Node.js installed
✅ MySQL installed (XAMPP)
✅ npm packages installed
✅ Backend running on port 5000

## Step-by-Step Setup

### 1. Install Dependencies (Already Done ✅)
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Edit `backend/.env`:

```env
# Stripe (Get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@zoro9x.com
```

**Getting Gmail App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password
4. Use in SMTP_PASSWORD

**Getting Stripe Keys:**
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy "Secret key" (starts with sk_test_)
4. For webhooks: Developers → Webhooks → Add endpoint

### 3. Start Backend

```bash
cd backend
npm run dev
```

Expected output:
```
✅ Database connected
✅ Users table ready
✅ Admin table ready
✅ SaaS tables initialized
✅ Extended tables initialized (NEW)
🚀 Server started on port 5000
```

### 4. Verify Tables Created

Open phpMyAdmin (http://localhost/phpmyadmin) and check:

**New Tables (should see 12):**
- coupons
- coupon_redemptions
- invoices
- invoice_items
- usage_records
- usage_limits
- two_factor_auth
- audit_logs
- gdpr_requests
- rate_limits
- email_templates
- email_logs

## Testing Features

### Test 1: Email Service

Create `backend/test-email.js`:
```javascript
require('dotenv').config();
const { sendWelcomeEmail } = require('./services/emailService');

async function test() {
  await sendWelcomeEmail(
    'your-email@gmail.com',
    'Test Company',
    'test-api-key-123456'
  );
  console.log('Email sent!');
}

test();
```

Run:
```bash
node backend/test-email.js
```

Check your email inbox for welcome email.

### Test 2: Coupon System

**Create a coupon (as admin):**
```bash
curl -X POST http://localhost:5000/api/coupons \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "discountType": "percentage",
    "discountValue": 50,
    "maxRedemptions": 100,
    "minPurchaseAmount": 20
  }'
```

**Validate coupon:**
```bash
curl -X POST http://localhost:5000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "LAUNCH50",
    "planId": 1,
    "amount": 99
  }'
```

Expected response:
```json
{
  "valid": true,
  "originalAmount": 99,
  "discountAmount": 49.5,
  "finalAmount": 49.5
}
```

### Test 3: 2FA Setup

**Step 1 - Setup:**
```bash
curl -X POST http://localhost:5000/api/2fa/setup \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

Response includes:
- `secret` - TOTP secret
- `qrCode` - Base64 QR code image
- `backupCodes` - 10 backup codes

**Step 2 - Scan QR code:**
1. Copy qrCode value
2. Paste in browser: `<img src="data:image/png;base64,PASTE_HERE">`
3. Scan with Google Authenticator app

**Step 3 - Enable:**
```bash
curl -X POST http://localhost:5000/api/2fa/enable \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_SECRET_FROM_STEP1",
    "token": "123456"
  }'
```

### Test 4: Usage Tracking

Add to any API endpoint:
```javascript
const { recordUsage } = require('../services/usageService');

// In your route handler
await recordUsage(clientId, systemId, 'api_calls', 1);
```

**Get usage stats:**
```bash
curl -X GET "http://localhost:5000/api/usage?clientId=1&systemId=1"
```

### Test 5: Rate Limiting

Make 61 requests quickly:
```bash
for i in {1..61}; do 
  curl http://localhost:5000/api/saas/systems
  echo "Request $i"
done
```

After 60 requests, you'll see:
```json
{
  "error": "Too many requests",
  "retryAfter": 60
}
```

### Test 6: Invoice Generation

**Create invoice:**
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "subscriptionId": 1,
    "items": [
      {
        "description": "Premium Plan - Monthly",
        "quantity": 1,
        "unitPrice": 99
      }
    ],
    "tax": 10,
    "notes": "Thank you for your business"
  }'
```

Check `backend/invoices/` folder for generated PDF.

### Test 7: Audit Logs

All actions are automatically logged. View logs:

```bash
curl -X GET "http://localhost:5000/api/audit/logs?limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Using Features in Purchase Flow

The purchase flow now includes all features:

```javascript
// Frontend purchase request
const response = await fetch('/api/saas/purchase', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    system_id: 1,
    plan_id: 2,
    company_name: 'My Company',
    contact_email: 'user@example.com',
    contact_phone: '1234567890',
    billing_cycle: 'monthly',
    payment_method_id: 'pm_xxx', // From Stripe
    coupon_code: 'LAUNCH50' // Optional
  })
});
```

**What happens automatically:**
1. ✅ Creates Stripe customer
2. ✅ Creates Stripe subscription
3. ✅ Applies coupon discount
4. ✅ Records payment
5. ✅ Sends welcome email
6. ✅ Sends subscription email
7. ✅ Logs audit trail
8. ✅ Starts trial if configured
9. ✅ Generates API key
10. ✅ Creates database

## Common Use Cases

### Use Case 1: Free Trial
Set `trial_days` in subscription plan:
```sql
UPDATE subscription_plans 
SET trial_days = 14 
WHERE id = 2;
```

Next purchase of that plan gets 14-day trial.

### Use Case 2: Launch Discount
```javascript
// Create 30% off coupon valid for 1 month
{
  "code": "LAUNCH30",
  "discountType": "percentage",
  "discountValue": 30,
  "validUntil": "2024-12-31",
  "maxRedemptions": 1000
}
```

### Use Case 3: Usage Limits
```javascript
// Set API call limit
await setUsageLimit(clientId, systemId, 'api_calls', 10000, 'monthly');

// In API endpoint
const limitCheck = await checkUsageLimit(clientId, systemId, 'api_calls');
if (!limitCheck.withinLimit) {
  return res.status(429).json({ error: 'Usage limit exceeded' });
}
```

### Use Case 4: Referral Discount
```javascript
// Create one-time $20 off
{
  "code": "REFER20",
  "discountType": "fixed",
  "discountValue": 20,
  "maxRedemptions": 1
}
```

### Use Case 5: Enterprise Coupon
```javascript
// 50% off for specific plan only
{
  "code": "ENTERPRISE50",
  "discountType": "percentage",
  "discountValue": 50,
  "applicablePlans": [3], // Enterprise plan ID
  "minPurchaseAmount": 500
}
```

## API Testing with Postman

**Import this collection:**

```json
{
  "name": "ZORO9X Advanced Features",
  "requests": [
    {
      "name": "Create Coupon",
      "method": "POST",
      "url": "http://localhost:5000/api/coupons",
      "headers": {
        "Authorization": "Bearer {{admin_token}}",
        "Content-Type": "application/json"
      },
      "body": {
        "code": "TEST20",
        "discountType": "percentage",
        "discountValue": 20
      }
    },
    {
      "name": "Setup 2FA",
      "method": "POST",
      "url": "http://localhost:5000/api/2fa/setup",
      "headers": {
        "Authorization": "Bearer {{user_token}}"
      }
    },
    {
      "name": "Create Invoice",
      "method": "POST",
      "url": "http://localhost:5000/api/invoices",
      "headers": {
        "Authorization": "Bearer {{admin_token}}",
        "Content-Type": "application/json"
      },
      "body": {
        "clientId": 1,
        "subscriptionId": 1,
        "items": [
          {
            "description": "Service",
            "quantity": 1,
            "unitPrice": 99
          }
        ]
      }
    }
  ]
}
```

## Monitoring

### Check Email Logs
```sql
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE action = 'PURCHASE_SUBSCRIPTION' 
ORDER BY created_at DESC;
```

### Check Rate Limits
```sql
SELECT identifier, identifier_type, request_count, is_blocked 
FROM rate_limits 
WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

### Check Usage
```sql
SELECT client_id, metric, SUM(quantity) as total 
FROM usage_records 
WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) 
GROUP BY client_id, metric;
```

## Troubleshooting

### Issue: Emails not sending
**Solution:**
1. Check SMTP credentials
2. Verify Gmail app password (not regular password)
3. Check `email_logs` table for errors
4. Test with simple script

### Issue: Stripe errors
**Solution:**
1. Verify API keys are correct
2. Check if test mode keys (sk_test_)
3. Review Stripe dashboard logs
4. Check webhook secret

### Issue: 2FA not working
**Solution:**
1. Verify phone time is synchronized
2. Check token window (default 2 = ±60 seconds)
3. Try backup codes
4. Regenerate secret and try again

### Issue: Rate limiting not working
**Solution:**
1. Check `rate_limits` table exists
2. Verify middleware order in routes
3. Check database connection
4. Clear old records

### Issue: Coupons not applying
**Solution:**
1. Check coupon is active
2. Verify validity dates
3. Check redemption count
4. Verify plan applicability
5. Check minimum purchase amount

## Production Checklist

Before deploying to production:

1. **Environment:**
   - [ ] Set NODE_ENV=production
   - [ ] Use production Stripe keys
   - [ ] Configure production SMTP
   - [ ] Set strong JWT_SECRET

2. **Security:**
   - [ ] Enable HTTPS
   - [ ] Set secure cookie flags
   - [ ] Review CORS settings
   - [ ] Review rate limits
   - [ ] Enable 2FA for admins

3. **Stripe:**
   - [ ] Switch to live API keys
   - [ ] Configure production webhooks
   - [ ] Test payment flow
   - [ ] Set up webhook monitoring

4. **Email:**
   - [ ] Use professional email service
   - [ ] Configure SPF/DKIM records
   - [ ] Test all email templates
   - [ ] Set up bounce handling

5. **Monitoring:**
   - [ ] Set up error tracking (Sentry)
   - [ ] Configure log aggregation
   - [ ] Set up uptime monitoring
   - [ ] Configure database backups

6. **Scheduled Tasks:**
   - [ ] Set up cron jobs
   - [ ] Test trial expiration
   - [ ] Test usage resets
   - [ ] Test overdue reminders

## Support

For issues or questions:
1. Check `ADVANCED_FEATURES_GUIDE.md` for detailed docs
2. Review `IMPLEMENTATION_SUMMARY.md` for overview
3. Check error logs in `backend/logs/`
4. Review database `email_logs` and `audit_logs` tables

## Next Steps

1. ✅ Backend features implemented
2. ⏭️ Create frontend components
3. ⏭️ Add webhook endpoint
4. ⏭️ Set up cron jobs
5. ⏭️ Complete GDPR endpoints
6. ⏭️ End-to-end testing

---

**You're ready to start using all 11 advanced SaaS features! 🚀**
