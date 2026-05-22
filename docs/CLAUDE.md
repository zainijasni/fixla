# Fixla Platform — Claude Code Instructions

> Baca file ini sepenuhnya sebelum menulis sebarang kod.
> Semua keputusan teknikal dalam file ini adalah MUKTAMAD.

---

## 🧠 Project Overview

**Fixla** adalah marketplace platform servis tempatan Malaysia.
- Website: https://fixla.my
- Model: Menghubungkan customer dengan service provider (tukang repair, technician, dll)
- Target market: Malaysia → SEA
- Strategy: Build-to-acquire (exit kepada Grab, Sea Group, AirAsia, dll)

---

## 👥 User Roles

| Role | Fungsi |
|---|---|
| `customer` | Post job request, pilih provider, buat review |
| `provider` | Browse jobs, place bid, complete job |
| `admin` | Verify provider, manage platform |

---

## 🛠️ Tech Stack — JANGAN UBAH

### Frontend
```
Framework  : Next.js 14 (App Router)
Styling    : Tailwind CSS
State      : Zustand
Forms      : React Hook Form + Zod
HTTP       : Axios
Socket     : socket.io-client
PWA        : next-pwa
```

### Backend
```
Runtime    : Node.js
Framework  : Express.js
Auth       : JWT (jsonwebtoken)
Validation : Zod
Upload     : Multer + Cloudinary
Socket     : socket.io
Password   : bcryptjs
```

### Database
```
Primary    : PostgreSQL
ORM        : pg (node-postgres) — BUKAN Prisma, BUKAN Sequelize
Cache      : Redis (ioredis)
```

### Infrastructure
```
Frontend   : Vercel
Backend    : Railway.app
Database   : Railway PostgreSQL
Media      : Cloudinary
Domain     : fixla.my (Hostinger DNS)
Email      : Hostinger (noreply@fixla.my)
```

---

## 📁 Folder Structure — IKUT EXACTLY

```
fixla/
├── apps/
│   ├── web/                        ← Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── (customer)/
│   │   │   │   ├── page.tsx        ← home browse
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── new/        ← post job
│   │   │   │   │   └── [id]/       ← job detail
│   │   │   │   └── providers/
│   │   │   │       └── [id]/       ← provider profile
│   │   │   ├── (provider)/
│   │   │   │   ├── dashboard/      ← provider dashboard
│   │   │   │   ├── jobs/           ← browse nearby jobs
│   │   │   │   └── profile/        ← edit profile
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── register/provider/
│   │   │   ├── (admin)/
│   │   │   │   └── dashboard/
│   │   │   ├── chat/
│   │   │   │   └── [conversationId]/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                 ← reusable UI components
│   │   │   ├── customer/           ← customer-specific components
│   │   │   ├── provider/           ← provider-specific components
│   │   │   └── shared/             ← shared components
│   │   ├── lib/
│   │   │   ├── api.ts              ← axios instance
│   │   │   ├── auth.ts             ← auth helpers
│   │   │   ├── utils.ts
│   │   │   └── constants.ts
│   │   ├── hooks/                  ← custom React hooks
│   │   ├── store/                  ← Zustand stores
│   │   ├── types/                  ← TypeScript types
│   │   └── public/
│   │
│   └── api/                        ← Node.js Express backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.js
│       │   │   ├── users.routes.js
│       │   │   ├── providers.routes.js
│       │   │   ├── categories.routes.js
│       │   │   ├── jobs.routes.js
│       │   │   ├── bids.routes.js
│       │   │   ├── assignments.routes.js
│       │   │   ├── reviews.routes.js
│       │   │   ├── conversations.routes.js
│       │   │   ├── notifications.routes.js
│       │   │   └── admin.routes.js
│       │   ├── controllers/
│       │   │   └── [nama].controller.js (satu per route file)
│       │   ├── middleware/
│       │   │   ├── authenticate.js  ← verify JWT
│       │   │   ├── requireRole.js   ← check role
│       │   │   ├── validate.js      ← Zod validation
│       │   │   ├── upload.js        ← Multer + Cloudinary
│       │   │   └── rateLimiter.js
│       │   ├── models/
│       │   │   └── [nama].model.js  ← raw SQL queries guna pg
│       │   ├── services/
│       │   │   ├── cloudinary.service.js
│       │   │   ├── email.service.js
│       │   │   └── socket.service.js
│       │   ├── utils/
│       │   │   ├── haversine.js     ← distance calculation
│       │   │   ├── jwt.js
│       │   │   └── response.js      ← standard response helper
│       │   ├── socket/
│       │   │   └── index.js         ← socket.io handlers
│       │   ├── config/
│       │   │   ├── db.js            ← PostgreSQL connection pool
│       │   │   └── redis.js
│       │   └── app.js               ← Express app setup
│       ├── index.js                 ← server entry point
│       └── .env
│
├── database/
│   ├── schema.sql                   ← 20 tables (SUDAH SIAP)
│   └── seeds/
│       ├── categories.sql           ← seed kategori servis
│       └── admin.sql                ← seed admin user
│
└── docs/
    ├── CLAUDE.md                    ← file ini
    └── api.md                       ← API documentation
```

---

## 🗄️ Database — PostgreSQL

**Connection:** Guna `pg` Pool, BUKAN ORM.

```javascript
// config/db.js
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
module.exports = pool
```

**Query pattern:**
```javascript
// models/jobs.model.js
const pool = require('../config/db')

const createJob = async (data) => {
  const { rows } = await pool.query(
    `INSERT INTO job_requests (...) VALUES (...) RETURNING *`,
    [data.customer_id, data.title, ...]
  )
  return rows[0]
}
```

**20 Tables (schema.sql):**
```
users, provider_profiles, service_categories,
service_subcategories, provider_categories,
provider_service_areas, provider_documents,
job_requests, job_images, job_bids,
job_assignments, job_status_logs, reviews,
conversations, messages, notifications,
payments, featured_listings, saved_providers,
admin_logs
```

---

## 🔐 Authentication

- JWT Bearer token dalam Authorization header
- Token expiry: 7 hari
- Refresh token: 30 hari
- Password: bcrypt dengan salt rounds 12

```javascript
// Header format
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Middleware flow:**
```
Request → rateLimiter → authenticate → requireRole → validate → controller
```

---

## 📐 Coding Conventions

### Backend (JavaScript)
```javascript
// ✅ Guna async/await, BUKAN callbacks
const getJob = async (req, res) => {
  try {
    const job = await JobModel.findById(req.params.id)
    return res.json({ success: true, job })
  } catch (error) {
    next(error)
  }
}

// ✅ Standard response format
// Success:
res.json({ success: true, data: result })

// Error:
res.status(400).json({
  success: false,
  error: { code: 'VALIDATION_ERROR', message: '...' }
})
```

### Frontend (TypeScript)
```typescript
// ✅ Guna TypeScript untuk semua components
// ✅ Guna 'use client' hanya bila perlu
// ✅ Server Components by default
// ✅ Tailwind untuk semua styling — BUKAN CSS files
// ✅ Mobile-first responsive design
```

### Database
```sql
-- ✅ Semua ID guna UUID
-- ✅ Semua timestamp guna TIMESTAMPTZ
-- ✅ Parameterized queries — JANGAN string concatenation (SQL injection risk)
```

---

## 📱 UI/UX Principles

```
1. Browse-first — buka app terus nampak servis, BUKAN landing page
2. Mobile-first — design untuk phone dulu
3. Minimal text — user tak nak baca banyak
4. Location-aware — tunjuk provider berdekatan dengan user
5. Malay + English — bilingual support
6. Warna utama: Hijau (#1D9E75) — trustworthy, local feel
```

---

## 🚫 MVP Scope — JANGAN BUILD DALAM FASA 1

```
❌ Payment gateway (Billplz/CHIP) — Fasa 2
❌ Lead unlock fee system — Fasa 2
❌ Featured listing — Fasa 2
❌ Push notifications (FCM) — Fasa 2
❌ Android APK (Capacitor) — Fasa 2
❌ ML matching engine (Python) — Fasa 3
❌ Analytics dashboard — Fasa 3
❌ B2B reporting — Fasa 4
```

---

## ✅ MVP Scope — BUILD DALAM FASA 1

```
✅ Auth (register customer, register provider, login)
✅ Provider profile + document upload
✅ Service categories (seeded)
✅ Job request CRUD + image upload
✅ Job bidding system
✅ Accept/reject bid
✅ In-app messaging (Socket.io)
✅ Review & rating
✅ Provider nearby search (Haversine)
✅ Basic admin panel (verify provider)
✅ Notification system (in-app sahaja)
```

---

## 🌐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=https://fixla.my

DATABASE_URL=postgresql://user:pass@host:5432/fixla
REDIS_URL=redis://localhost:6379

JWT_SECRET=minimum-32-character-random-string
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=noreply@fixla.my
EMAIL_PASS=
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.fixla.my
NEXT_PUBLIC_SOCKET_URL=https://api.fixla.my
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

---

## 🚀 Setup Commands

### Initial Setup
```bash
# Clone dan install
git clone https://github.com/[username]/fixla-platform
cd fixla-platform

# Install backend
cd apps/api
npm install

# Install frontend
cd ../web
npm install

# Setup database
psql $DATABASE_URL < ../../database/schema.sql
psql $DATABASE_URL < ../../database/seeds/categories.sql
psql $DATABASE_URL < ../../database/seeds/admin.sql
```

### Development
```bash
# Run backend (dari apps/api)
npm run dev        # nodemon index.js — port 5000

# Run frontend (dari apps/web)
npm run dev        # next dev — port 3000
```

---

## 📦 Key Dependencies

### Backend
```json
{
  "express": "^4.18.x",
  "pg": "^8.11.x",
  "ioredis": "^5.3.x",
  "jsonwebtoken": "^9.0.x",
  "bcryptjs": "^2.4.x",
  "zod": "^3.22.x",
  "multer": "^1.4.x",
  "cloudinary": "^2.0.x",
  "socket.io": "^4.6.x",
  "cors": "^2.8.x",
  "helmet": "^7.0.x",
  "express-rate-limit": "^7.0.x",
  "dotenv": "^16.0.x",
  "nodemon": "^3.0.x"
}
```

### Frontend
```json
{
  "next": "14.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "zustand": "^4.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "axios": "^1.x",
  "socket.io-client": "^4.x",
  "next-pwa": "^5.x"
}
```

---

## 🗺️ Service Categories (Seed Data)

```
1. Elektrikal (electrical)
   - Repair lampu, kipas, suis, soket
   - Pasang water heater
   - Circuit breaker
   - Pasang CCTV

2. Aircond (aircond)
   - Service aircond
   - Repair aircond
   - Pasang aircond baru
   - Refill gas

3. Plumbing (plumbing)
   - Repair paip bocor
   - Repair toilet
   - Repair sink
   - Pam air & tangki

4. Appliance Repair (appliance)
   - TV repair
   - Peti ais
   - Mesin basuh
   - Microwave & hood

5. IT & Teknologi (it-tech)
   - Repair laptop/komputer
   - Install software
   - Virus removal
   - WiFi setup
   - Data recovery
   - Repair telefon

6. Handyman (handyman)
   - Repair pintu/tingkap
   - Cat dinding
   - Pasang perabot
   - Bumbung bocor
   - Pest control
```

---

## ⚠️ Penting — Baca Sebelum Code

1. **Refer api.md** untuk semua endpoint specifications
2. **Guna UUID** untuk semua ID — BUKAN integer auto-increment
3. **Jangan guna ORM** — raw SQL dengan `pg` sahaja
4. **Mobile-first** — semua UI design untuk phone screen dulu
5. **Bilingual** — semua user-facing text support BM dan English
6. **Security** — helmet, cors, rate limiting WAJIB dari hari pertama
7. **Error handling** — semua async functions kena ada try/catch
8. **Validation** — semua input kena validate dengan Zod sebelum sampai database
9. **Distance** — guna Haversine formula untuk nearby calculations
10. **No payment code** — payment feature adalah Fasa 2, jangan implement lagi
