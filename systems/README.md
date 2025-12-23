# SaaS Systems - Windows Applications

This folder contains Python-based Windows desktop applications for various SaaS systems offered through the ZORO9X platform.

## Available Systems

### 1. Gym Management System (`gym_management.py`)
Complete gym management solution with the following features:
- Member Management
- Payment & Billing System
- Attendance Tracking
- Workout Plans & Scheduling
- Staff Management
- Equipment Tracking
- Reports & Analytics
- Access Control System

### 2. Restaurant Management System (`restaurant_management.py`)
Full-featured restaurant management with:
- POS (Point of Sale) System
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
