# HealthQueue+ — PFG Build

A full-stack healthcare queue management system for private clinics.

## Repository Structure

```
hqplus_pfg/
├── hq-server/       ← Node.js/Express REST API (MongoDB)
├── hq-mobapp/       ← Flutter patient mobile app (iOS/Android)
└── hq-tabapp/       ← Flutter staff tablet app (landscape-locked)
```

## Quick Start

### 1. Server

```bash
cd hq-server
cp .env.example .env    # Fill in your MongoDB URI and JWT secret
npm install
npm run seed            # Optional: seed demo data
npm run dev             # Starts on port 4000
```

**Health check:** `GET http://localhost:4000/health`

### 2. Mobile / Tablet Apps

```bash
cd hq-mobapp   # or hq-tabapp
cp .env.example .env
flutter pub get
flutter run
```

Set `API_BASE_URL` in `.env` to point to your running server, e.g. `http://10.0.2.2:4000` for Android emulator or `http://localhost:4000` for iOS simulator.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Patient self-registration |
| POST | `/api/auth/login` | — | Login (all roles) |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/clinics/directory` | ✓ | Live clinic list |
| GET | `/api/clinics/recommend` | ✓ | AI-recommended clinics |
| POST | `/api/queues/join` | patient | Join walk-in queue |
| GET | `/api/queues/my-status` | patient | Patient queue status |
| GET | `/api/queues/metrics` | staff | Queue stats |
| POST | `/api/queues/add-walkin` | staff | Staff adds walk-in |
| PUT | `/api/queues/:id/call` | staff | Call patient |
| PUT | `/api/queues/:id/complete` | staff | Mark done |
| PUT | `/api/queues/:id/skip` | staff | Skip patient |
| POST | `/api/appointments` | patient | Book appointment |
| GET | `/api/appointments/available-slots` | ✓ | Check open slots |
| PUT | `/api/appointments/:id/status` | staff | Update status |
| GET | `/api/dashboard/facility` | admin | Facility stats |
| GET | `/api/dashboard/super-admin` | super_admin | Global stats |
| POST | `/api/chatbot/message` | ✓ | Chatbot (Rasa or fallback) |

## Roles

| Role | App | Access |
|------|-----|--------|
| `super_admin` | Web | Full system access |
| `facility_admin` | Web | Own clinic only |
| `staff` | Tablet | Own clinic queue & appointments |
| `patient` | Mobile | Queue join, appointments, profile |

## Seed Login Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@healthqueue.ph` | `Admin@123` |
| Facility Admin | `admin.delacruz@healthqueue.ph` | `Admin@123` |
| Staff | `staff.santos@healthqueue.ph` | `Staff@123` |
| Patient | `ana.reyes@gmail.com` | `Patient@123` |
| Patient | `carlos.b@gmail.com` | `Patient@123` |

## Environment Variables

See `hq-server/.env.example` for the full list. Required at minimum:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — Long random string
- `PORT` — Server port (default: 4000)
