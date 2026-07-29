# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system built for a wholesale/distribution business. It handles customers, products, stock, and sales challans, with role-based access for Admin, Sales, Warehouse, and Accounts teams.

This was built as a full-stack case study assignment — the goal was to show real understanding of backend APIs, database design, frontend UI, and how these business flows actually work together end to end, not to build a massive system.

---

## 🌐 Live Deployment

- **Frontend:** https://full-stack-erp-crm-portal.vercel.app
- **Backend API:** https://fullstack-erp-crm-portal.onrender.com
- **Health check:** https://fullstack-erp-crm-portal.onrender.com/api/health

> Note: the backend is on Render's free tier, which spins down after periods of inactivity. If it's been idle, the first request can take 30–50 seconds to wake up — this is expected, not a bug.

---

## 🛠 Tech Stack

**Backend**

- Node.js + TypeScript
- Express.js
- PostgreSQL (hosted on Supabase)
- JWT-based authentication
- Zod for request validation

**Frontend**

- React 18 + TypeScript
- Vite
- React Router

**Database**

- PostgreSQL via Supabase

**Hosting**

- Frontend: Vercel
- Backend: Render
- Database: Supabase (free tier)

---

## 📁 Project Structure

```
mini-erp/
├── backend/
│   ├── db/
│   │   ├── schema.sql        # all table definitions
│   │   └── seed.sql          # test users + sample data
│   ├── src/
│   │   ├── config/           # database connection
│   │   ├── middleware/       # auth + error handling
│   │   ├── routes/           # auth, customers, products, challans
│   │   └── index.ts          # app entry point
│   ├── .env                  # local environment variables (not committed)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboard, Customers, Products, Challans, Layout, Modal
│   │   ├── api.ts            # fetch wrapper + shared helpers
│   │   ├── App.tsx           # routing + auth state
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```

---

## ⚙️ Setup & Installation (Local Development)

### Prerequisites

- Node.js (v18 or later)
- A PostgreSQL database — this project uses a free Supabase project, but any Postgres instance works
- npm

### 1. Clone the repo

```bash
git clone https://github.com/Adddy13/FullStack-ERP-CRM-PORTAL.git
cd FullStack-ERP-CRM-PORTAL
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```
PORT=5000
JWT_SECRET=your_own_secret_key_here

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=postgres
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

If you're using Supabase, these come from **Project Settings → Database → Connection info**. Use the pooler host on port `5432` (session mode), not `6543` (transaction mode) — this app runs multi-statement transactions when confirming challans, which the transaction pooler doesn't support.

⚠️ Never commit your real `.env` file — it's already listed in `.gitignore`.

### 3. Set up the database

Run the schema first, then the seed data, against your database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

(No `psql` handy? Paste the contents of both files into the Supabase SQL editor instead — works exactly the same.)

### 4. Run the backend

```bash
npm run dev
```

API runs on `http://localhost:5000`.

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000` and proxies `/api` requests to the backend (see `vite.config.ts`), so both need to be running at the same time during local development.

---

## 🔑 Test Login Credentials

All seeded accounts use the same password so it's easy to test each role — works on both the live deployment and a local setup:

| Role      | Username     | Password      |
| --------- | ------------ | ------------- |
| Admin     | `admin`      | `password123` |
| Sales     | `sales1`     | `password123` |
| Warehouse | `warehouse1` | `password123` |
| Accounts  | `accounts1`  | `password123` |

---

## 📡 API Overview

Base URL: `https://fullstack-erp-crm-portal.onrender.com/api` (or `http://localhost:5000/api` locally)

**Auth**

- `POST /auth/login` — login, returns a JWT
- `GET /auth/me` — get current logged-in user

**Customers**

- `GET /customers` — list (supports `search`, `status`, pagination)
- `POST /customers` — create
- `GET /customers/:id` — detail (includes follow-up history)
- `PUT /customers/:id` — update
- `POST /customers/:id/follow-ups` — add a follow-up note

**Products**

- `GET /products` — list (supports `search`, `low_stock`, pagination)
- `POST /products` — create
- `GET /products/:id` — detail (includes stock movement history)
- `PUT /products/:id` — update
- `POST /products/:id/stock-movements` — log a stock IN/OUT movement

**Challans**

- `GET /challans` — list (supports `search`, `status`, pagination)
- `POST /challans` — create (Draft or Confirmed)
- `GET /challans/:id` — detail (includes line items)
- `PATCH /challans/:id/status` — update status (Draft → Confirmed → Cancelled)

---

## 🧠 How It's Built

**Roles** are enforced through middleware on the backend, so it's not just a frontend-level restriction — every protected route checks the JWT and, where relevant, the user's role.

**Stock logic** is the part I paid the most attention to. When a challan is confirmed:

- Stock is checked and reduced inside a database transaction, so a partial failure can't leave things in a broken state.
- If stock isn't enough for any item, the whole request fails with a clear error instead of silently under-selling.
- Each challan line item stores a snapshot of the product's name, SKU, and price at the time of sale, so old challans stay accurate even if a product's price changes later.

**Follow-ups** live in their own table linked to a customer, so a customer builds up a real history of notes over time instead of just one "next follow-up" field being overwritten.

**Frontend** is a proper React app talking to the real backend for every read and write — there's no mock/demo data layer, so what you see in the UI is always what's actually in the database.

---

## 🚧 Known Limitations

- No automated tests yet (unit or integration) — everything's been tested manually so far.
- No Docker setup or CI/CD pipeline.
- Invoice PDF export and S3 image upload (the bonus items) aren't built.
- No Postman collection included yet — API can be tested via the live frontend or any REST client using the endpoints listed above.
- Reporting for the Accounts role is currently read-only access to challans/customers — no dedicated financial reports yet.
- AWS deployment wasn't attempted since it was optional in the brief; deployed instead on free-tier hosting (Render + Vercel + Supabase).
- Backend is on Render's free tier, so there's a cold-start delay (30–50s) after periods of inactivity.

---

## 🤔 Assumptions Made

- GST number is stored as plain text rather than validated against a strict format, since the brief didn't specify one.
- Challan numbers are auto-generated sequentially by the backend rather than entered manually, to avoid duplicates.
- There's no hard "delete" for customers or products — records can be edited or marked Inactive instead, since a wholesale business generally wants a trail rather than silent deletion.
