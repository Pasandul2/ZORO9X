# 🚀 Quick Start: System Generator

## Access
1. **Login**: http://localhost:5173/admin/login
2. **Navigate**: Click "🚀 System Generator" card on dashboard
3. **Direct URL**: http://localhost:5173/admin/generate-system

---

## 4-Step Process

### Step 1: Basic Info ℹ️
```
System Name:   Restaurant Management
Category:      restaurant
Description:   Complete restaurant operations system
Icon URL:      (optional)
```

### Step 2: Features 🎯

**Basic Features** (Blue cards):
- Order Taking
- Billing  
- Menu Management

**Premium Features** (Yellow cards):
- Advanced Analytics
- Custom Reports
- Multi-location Support

### Step 3: Database 🗄️

**Table: orders**
| Field | Type | PK | NOT NULL |
|-------|------|----|----|
| id | INTEGER | ✓ | - |
| order_number | TEXT | - | ✓ |
| customer_name | TEXT | - | - |
| total_amount | REAL | - | - |
| status | TEXT | - | - |
| created_at | TIMESTAMP | - | - |

**Table: menu_items**
| Field | Type | PK | NOT NULL |
|-------|------|----|----|
| id | INTEGER | ✓ | - |
| name | TEXT | - | ✓ |
| price | REAL | - | ✓ |
| category | TEXT | - | - |

### Step 4: Generate ⚡
Click **"Generate System"** → Wait 5-10 seconds → ✅ Success!

---

## What You Get

### File Structure
```
systems/restaurant_management/
├── basic/
│   ├── restaurant_app.py      ← Desktop app (3 features)
│   ├── installer.py            ← Installation wizard
│   ├── requirements.txt        ← Dependencies
│   └── README.md               ← Documentation
└── premium/
    ├── restaurant_app.py      ← Desktop app (6 features)
    ├── installer.py            ← Installation wizard
    ├── requirements.txt        ← Dependencies
    └── README.md               ← Documentation
```

### Database Records
- ✅ System record in `systems` table
- ✅ Basic Plan: $29.99/month
- ✅ Premium Plan: $79.99/month

---

## Testing Generated System

### Run Installer
```bash
cd systems/restaurant_management/basic
python installer.py
```

### Test Application
1. Complete installation with test API key
2. Launch application from installed location
3. Verify all features work
4. Check database creation

---

## API Endpoints

### Create System
```http
POST /api/admin/generate-system
Body: { systemName, category, basicFeatures, premiumFeatures, tables }
Response: { success, systemId, paths, files }
```

### List Systems
```http
GET /api/admin/generated-systems
Response: { success, systems: [...] }
```

### Delete System
```http
DELETE /api/admin/generated-systems/:id
Response: { success, message }
```

### Regenerate
```http
POST /api/admin/generated-systems/:id/regenerate
Response: { success, message, files }
```

---

## Common Issues

### "Category already exists"
➡️ Use different category name or delete old system

### "Permission denied"
➡️ Check write permissions on `systems/` folder

### Files not created
➡️ Check backend console for errors, verify paths

### Database errors
➡️ Ensure MySQL is running and connected

---

## Tips

✅ **System Name**: Title Case (e.g., "Restaurant Management")  
✅ **Category**: lowercase_no_spaces (e.g., "restaurant")  
✅ **Basic Features**: 3-5 core features  
✅ **Premium Features**: 2-4 advanced features  
✅ **Tables**: Use plural names (orders, customers)  
✅ **Fields**: Use snake_case (customer_name)

---

## Example: Gym Management

### Input
- Name: "Gym Management"
- Category: "gym"
- Basic: ["Member Registration", "Attendance", "Billing"]
- Premium: ["Personal Training", "Diet Plans", "Analytics"]
- Tables: members, attendance, payments

### Output
✅ 2 complete desktop applications  
✅ 2 installers  
✅ Database schemas  
✅ All ready to distribute

---

## Next Steps

1. **Generate** your first system
2. **Test** both Basic & Premium versions
3. **Customize** templates if needed
4. **Distribute** to customers

---

**Phase 1 Complete** ✅  
Ready for production use!

For detailed documentation, see: [SYSTEM_GENERATOR_GUIDE.md](./SYSTEM_GENERATOR_GUIDE.md)
