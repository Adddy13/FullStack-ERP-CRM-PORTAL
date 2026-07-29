# Mini ERP + CRM Operations Portal

A small internal ERP/CRM system built for a wholesale/distribution business. It handles customers, products, stock, and sales challans, with role-based access for Admin, Sales, Warehouse, and Accounts teams.

This was built as a full-stack case study assignment — the goal was to show real understanding of backend APIs, database design, frontend UI, and how these business flows actually work together, not to build a massive system.

---

## 🛠 Tech Stack

**Backend**

- Node.js + TypeScript
- Express.js
- PostgreSQL (hosted on Supabase)
- JWT-based authentication
- Zod for request validation

**Frontend**

- HTML / CSS / vanilla JavaScript
- Responsive admin-style UI

**Database**

- PostgreSQL via Supabase

---

## 📁 Project Structure

```
mini-erp/
├── backend/
│   ├── db/
│   │   ├── schema.sql       # all table definitions
│   │   └── seed.sql         # test users + sample data
│   ├── src/
│   │   ├── config/          # database connection
│   │   ├── middleware/      # auth + error handling
│   │   ├── routes/          # auth, customers, products, challans
│   │   └── index.ts         # app entry point
│   ├── .env                 # local environment variables (not committed)
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js (v18 or later)
- A PostgreSQL database — this project uses a free Supabase project, but any Postgres instance works
- npm

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd mini-erp
```

### 2. Backend setup

```bash
cd backend
npm install
```

### 3. Set up environment variables

Create a `.env` file inside `backend/` (use `.env.example` as a reference if one is provided):

```
PORT=5000
JWT_SECRET=your_own_secret_key_here

DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=postgres
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

If you're using Supabase, you'll find these values under **Project Settings → Database → Connection info**. Use the connection pooler host on port `5432` (session mode) rather than the transaction pooler on `6543`, since this app runs multi-statement transactions when confirming challans.

⚠️ Never commit your real `.env` file. It's already listed in `.gitignore`.

### 4. Set up the database

Run the schema first, then the seed data, against your database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

(If you're not using `psql`, you can paste the contents of both files into the Supabase SQL editor instead — that works just as well.)

### 5. Run the backend

```bash
npm run dev
```

The API will start on `http://localhost:5000`.

### 6. Run the frontend

The frontend is plain HTML/CSS/JS, so there's no build step — just open `frontend/index.html` in your browser, or serve it with a simple static server:

```bash
cd frontend
npx serve .
```

Make sure the backend is running first, since the frontend talks to it at `http://localhost:5000/api`.

---

## 🔑 Test Login Credentials

All seeded accounts use the same password so it's easy to test each role:

| Role      | Username     | Password      |
| --------- | ------------ | ------------- |
| Admin     | `admin`      | `password123` |
| Sales     | `sales1`     | `password123` |
| Warehouse | `warehouse1` | `password123` |
| Accounts  | `accounts1`  | `password123` |

---

## 📡 API Overview

Base URL: `http://localhost:5000/api`

**Auth**

- `POST /auth/login` — login, returns a JWT
- `GET /auth/me` — get current logged-in user

**Customers**

- `GET /customers` — list (supports `search`, `status`, pagination)
- `POST /customers` — create
- `GET /customers/:id` — detail (includes follow-ups)
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

A Postman collection covering all of these is included in the repo.

---

## 🧠 How It's Built

**Roles** are enforced through middleware on the backend — each route checks the JWT and, where needed, the user's role, so it's not just a frontend-level restriction.

**Stock logic** is the part I paid the most attention to. When a challan is confirmed:

- Stock is checked and reduced inside a database transaction, so a partial update can't leave data in a weird state.
- If stock isn't enough for any item, the whole request fails with a clear error instead of silently under-selling.
- Each challan line item stores a snapshot of the product's name, SKU, and price at the time of sale — so if a product's price changes later, old challans still show what was actually charged.

**Follow-ups** are stored as their own table linked to a customer, so a customer can have a full history of notes over time instead of just one "next follow-up" field.

---

## 🚧 Known Limitations / What's Left

Being upfront about where this stands:

- AWS deployment wasn't attempted — this was optional per the brief, so I focused effort on getting the core system working correctly on Supabase + a free-tier host instead.
- No automated tests yet (unit or integration) — everything has been tested manually so far.
- No Docker setup or CI/CD pipeline.
- Invoice PDF export and S3 image upload (the bonus items) aren't built.
- Reporting for the Accounts role is currently limited to read access on challans/customers — no dedicated financial reports yet.

---

## 🤔 Assumptions Made

- Since the brief didn't specify strict GST number validation, I stored it as a plain text field rather than enforcing a strict format.
- Challan numbers are auto-generated sequentially by the backend rather than left for the user to type in, to avoid duplicates.
- "Deleting" a customer or product isn't implemented — data can be marked Inactive/edited instead, since a wholesale business generally wants a record trail rather than silent deletion.

---

## 📦 Deployment

- **Database:** Supabase (free tier)
- **Backend:** can be deployed to Render/Railway — set the same environment variables listed above in the host's dashboard
- **Frontend:** can be deployed as a static site to Vercel/Netlify, pointing `API_BASE` in `app.js` to the deployed backend URL

If you're running this purely locally instead, the steps above under **Setup & Installation** are all you need.
