# 🏋️ ZORO9X Gym Management System - Basic Edition

A comprehensive gym management application for small to medium-sized fitness centers.

## Features

### ✅ Included in Basic Edition

- **Member Management**
  - Add, edit, and delete members
  - Store contact information and emergency contacts
  - Track membership status
  - Search and filter members

- **Attendance Tracking**
  - Quick check-in system
  - Daily attendance reports
  - Member check-in history

- **Payment Management**
  - Record membership payments
  - Payment history tracking
  - Multiple payment methods support

- **Classes Management**
  - Create and manage fitness classes
  - Track class schedules
  - Monitor enrollment capacity

- **Dashboard & Reports**
  - Real-time statistics
  - Active member count
  - Today's attendance and revenue
  - New member tracking

### 🔒 Security Features

- API key validation on startup
- License checking with 3-day offline grace period
- Secure data storage in local SQLite database
- Usage logging for audit trail

## System Requirements

- Python 3.8 or higher
- Windows 10/11
- Internet connection (required for license validation)
- Minimum 4GB RAM
- 500MB free disk space

## Installation

1. Run the installer: `gym_installer.exe`
2. Follow the setup wizard
3. Enter your API key from ZORO9X platform
4. Enter your company name
5. Click "Validate & Continue"

## First-Time Setup

When you launch the application for the first time:

1. The setup wizard will appear
2. Enter the API key you received after purchasing your subscription
3. Enter your gym/company name
4. Click "Validate & Continue"

The application will validate your license and create the local database.

## Usage

### Adding a Member

1. Click "Members" in the sidebar
2. Click the "+ Add Member" button
3. Fill in the member details
4. Click "Save Member"

### Recording Attendance

1. Click "Attendance" in the sidebar
2. Enter the member ID or phone number
3. Click "Check In"

### Managing Payments

1. Click "Payments" in the sidebar
2. Click "+ Record Payment"
3. Fill in payment details
4. Click "Save"

## Database

The application uses SQLite for local data storage. The database file `gym_database.db` is created automatically in the application directory.

### Database Tables:
- `members` - Member information
- `memberships` - Membership plans and dates
- `attendance` - Check-in/check-out records
- `payments` - Payment transactions
- `classes` - Fitness class information

## Configuration

Configuration is stored in `gym_config.json`:

```json
{
  "api_key": "your-api-key-here",
  "company_name": "Your Gym Name"
}
```

## Upgrade to Premium

Want more features? Upgrade to Premium Edition for:

- Advanced analytics and insights
- Email/SMS notifications
- Online booking portal
- Payment gateway integration
- Multi-location support
- Custom branding
- Export to Excel/PDF
- And much more!

Contact support@zoro9x.com to upgrade.

## Support

For technical support or questions:
- Email: support@zoro9x.com
- Website: https://zoro9x.com
- Phone: +993-XX-XXX-XXX

## License

This software is licensed to the company specified during setup. Unauthorized distribution or sharing is prohibited and will result in license termination.

---

© 2025 ZORO9X. All rights reserved.
