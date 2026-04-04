# SaaS Fresh Platform (A-to-Z, Fully Separate New System)

This is a fully separate new platform from your old codebase.
It includes:

- Web SaaS store (purchase flow)
- Customer dashboard (self-service license lookup)
- Admin panel (secure login, overview metrics, renewal operations)
- Admin product manager (create product + upload installer/EXE/ZIP)
- Licensing backend API
- MySQL database
- Python desktop runtime guard (activation + periodic validation)
- Docker deployment stack

## Project Layout

- `backend/` Node.js + Express + MySQL API
- `frontend/` React web app (store + admin)
- `python_client/` Desktop license validation module
- `docker-compose.yml` Full stack deployment

## Implemented Business Rules

- User purchases product online
- System generates unique activation key
- Activation binds to first PC device ID
- Same key on second PC is blocked
- License has fixed duration (default 30 days)
- Client validates online every 4 days
- Expired license is locked and can be renewed
- Download allowed only for purchased and active license

## Backend API Summary

- `GET /api/health`
- `POST /api/admin/login`
- `GET /api/store/products`
- `POST /api/store/purchase`
- `GET /api/store/customer-licenses?email=...`
- `GET /api/store/download/:productSlug?activationKey=...`
- `GET /api/store/download/:productSlug/file?activationKey=...`
- `POST /api/licenses/activate`
- `POST /api/licenses/validate`
- `POST /api/licenses/renew` (admin JWT or admin key)
- `GET /api/admin/overview` (admin JWT or admin key)
- `GET /api/admin/licenses` (admin JWT or admin key)
- `GET /api/admin/products` (admin JWT or admin key)
- `POST /api/admin/products` (admin JWT or admin key)
- `POST /api/admin/products/:productId/asset` (admin JWT or admin key)

## Web Routes

- `/` Store page
- `/dashboard` Customer dashboard
- `/admin/login` Admin login page
- `/admin` Admin operations panel

## Environment Variables

Use `backend/.env.example`:

- `PORT`
- `JWT_SECRET`
- `ADMIN_API_KEY`
- `BASE_DOWNLOAD_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Frontend env (`frontend/.env.example`):

- `VITE_API_BASE`

## Option A: Run Locally (without Docker)

### 1) Start MySQL

Create database/user manually in your MySQL instance:

```sql
CREATE DATABASE saas_fresh;
CREATE USER 'saas_user'@'%' IDENTIFIED BY 'saas_password';
GRANT ALL PRIVILEGES ON saas_fresh.* TO 'saas_user'@'%';
FLUSH PRIVILEGES;
```

### 2) Start backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend: `http://localhost:4500`

Default seeded admin login:

- Email: `admin@saasfresh.local`
- Password: `ChangeThisAdminPassword`
- Change immediately in production.

### 3) Start frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: Vite local URL (usually `http://localhost:5173`)

### 4) Start Python client

```bash
cd python_client
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Option B: Full Docker Deployment

From project root:

```bash
docker compose up --build -d
```

Services:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4500`
- MySQL host port: `3307`

Stop stack:

```bash
docker compose down
```

Stop + remove volumes:

```bash
docker compose down -v
```

## Quick End-to-End Test

1. Open frontend at `http://localhost:8080` (or Vite URL in local mode)
2. Login admin at `/admin/login`
3. Create new product from Admin Panel
4. Upload installer/asset file from Admin Panel (`.exe`, `.zip`, `.dmg`, etc)
5. Open Store page and purchase with customer email
6. Open Customer Dashboard, enter same email, and download file
7. Copy generated activation key
8. Run `python main.py`
9. Choose `1` to activate software
10. Choose `2` to start software
11. To test lock flow, set end date in DB to past time and run startup again

## Sample Python Project for Upload

Use the sample project in:

- `sample_system_project/main.py`
- `sample_system_project/build/build_windows_exe.bat`

Suggested flow:

1. Build EXE on Windows from sample project using PyInstaller
2. Upload built file from Admin Panel
3. Purchase and download from Customer Dashboard
4. Activate and verify through Python license manager

## Production Hardening Checklist

- Replace manual purchase simulation with payment gateway webhook
- Add admin password reset and forced rotation policy
- Store secrets in secret manager (not plain env files)
- Add rate limits and request logging
- Add server-side download signed URLs with short expiry
- Add device reset policy workflow (support/admin approval)
- Add CI/CD pipeline with automated tests
- Add backup/restore policy for MySQL
- Put frontend and API behind HTTPS reverse proxy

## Notes

- This implementation is intentionally clean and separate from your old system.
- You can now extend this as your primary production SaaS licensing platform.
