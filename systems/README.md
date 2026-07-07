# 🚀 ZORO9X SaaS Systems

This directory contains all downloadable desktop applications available through the ZORO9X platform.

## Directory Structure

```
systems/
├── gym_management/
│   ├── basic/                 # Basic tier
│   │   ├── gym_app.py         # Main application
│   │   ├── installer.py       # Installation wizard
│   │   ├── requirements.txt   # Python dependencies
│   │   └── README.md          # Documentation
│   └── premium/               # Premium tier
│       └── README.md          # Premium features list
├── restaurant_management/
│   ├── basic/                 # Basic tier (coming soon)
│   └── premium/               # Premium tier (coming soon)
└── README.md                  # This file
```

## Available Systems

### 🏋️ Gym Management System

**Basic Edition** - Perfect for small to medium gyms
- Member management (add, edit, delete, search)
- Attendance tracking with quick check-in
- Payment management and history
- Classes management
- Dashboard with real-time statistics
- SQLite local database
- License validation with offline grace period

**Premium Edition** - Enterprise-grade features
- All Basic features plus:
- Advanced analytics and forecasting
- Email/SMS notifications
- Online booking portal
- Payment gateway integration (Stripe, PayPal)
- Multi-location support
- Custom branding
- Advanced exports (Excel, PDF)
- Member photos and health tracking
- Mobile app integration
- Enhanced security with audit logs

### 🍽️ Restaurant Management System

**Status:** Coming Soon

Basic and Premium editions for restaurant operations management.
- Table Management
- Inventory Control
- Kitchen Display System
- Staff Scheduling
- Menu Management
- Order Management
- Sales Reports & Analytics
- Customer Management

## How to Use

### Requirements
- Python 3.8 or higher
- `requests` library for API communication

### Installation
```bash
pip install requests
```

### Running a System
Each system requires two parameters:
1. **API Key**: Your unique API key (obtained from your subscription)
2. **Database Name**: Your dedicated database name

```bash
python gym_management.py YOUR_API_KEY YOUR_DATABASE_NAME
```

or

```bash
python restaurant_management.py YOUR_API_KEY YOUR_DATABASE_NAME
```

### Getting Your Credentials
1. Log in to the ZORO9X web application
2. Go to "Marketplace" and purchase a system
3. Navigate to "Client Dashboard"
4. Find your system and copy the API Key and Database Name
5. Use these credentials to run the Windows application

## System Architecture

### Authentication Flow
1. System validates API key with the server on startup
2. API key is validated against the subscription database
3. Usage is logged for tracking and preventing sharing
4. System operates with dedicated database access

### API Integration
All systems communicate with the backend API at:
```
http://localhost:5000/api/saas/
```

Key endpoints:
- `/validate-key` - Validates API key
- System-specific endpoints for data operations

### Database Isolation
Each client gets a dedicated database when they purchase a subscription. This ensures:
- Data privacy and security
- No cross-client data contamination
- Independent scaling and performance
- Backup and recovery isolation

## Development Status

**Current Status**: Placeholder/Template
**Full Implementation**: Coming Soon

These files currently contain:
- Basic structure and class definitions
- API key validation
- Method stubs for all features
- Documentation for future implementation

## Adding New Systems

To add a new SaaS system:

1. Create a new Python file in this directory
2. Follow the same structure as existing systems:
   ```python
   class YourSystemManagementSystem:
       def __init__(self, api_key, database_name):
           # Initialize system
       
       def validate_api_key(self):
           # Validate with backend
       
       def start(self):
           # Start the application
   ```

3. Add the system to the database via Admin Dashboard
4. Create subscription plans
5. Implement the actual system features

## Security Notes

⚠️ **Important Security Practices**:
- Never share your API key
- Store API keys securely
- Don't commit API keys to version control
- API usage is logged and monitored
- Suspicious activity will result in subscription suspension

## Support

For issues or questions:
- Contact: support@zoro9x.com
- Documentation: Coming Soon
- Admin Dashboard: `/admin/saas-dashboard`

## License

These systems are proprietary software licensed to ZORO9X clients based on their subscription plans.

---

**ZORO9X** - SaaS Management Platform
Version 1.0.0


cd C:\ZORO9X\systems\gold_loan_management\basic
$env:ZORO9X_DEV_BYPASS_LICENSE="1"; python gold_loan_app.py
.\BUILD.bat   