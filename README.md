# Travel & Visa Agency ERP

A full-stack **ERP / CRM** for travel and visa agencies: manage leads and customers, run visa applications through a status workflow, quote → invoice → collect payments, sell flight tickets from your own fare sheet (keeping an agency margin), track expenses and commissions, and read it all back through dashboards and reports.

Monorepo with two workspaces — a Node/Express + Prisma API and a React (Vite) client — backed by PostgreSQL.

---

## Features

| Area | What it does |
| --- | --- |
| **CRM** | Leads, customers, and follow-ups with a role/permission matrix. |
| **Visa** | Countries & visa types, applications with a guided status machine, appointments. |
| **Travel** | Flights, hotels, packages, and bookings with line items and server-computed totals. |
| **Agency Fares & Ticket Counter** | Enter market fares and an optional margin; the **selling price is always computed server-side**. Search live fares by route/date/cabin/pax and sell into a confirmed booking. Seats decrement on sell and restore on cancel. Airports & airlines master data (6,000+ airports, 1,200+ airlines) seeded offline from OpenFlights. |
| **Finance** | Quotations → invoices → payments, refunds, expenses, and agent commissions with approvals. |
| **Partners** | Suppliers and agents. |
| **Team** | Employees and roles. |
| **Documents & Communications** | File upload/verify/download and an activity log. |
| **Reports & Dashboard** | KPIs, revenue, pipeline, receivables, expenses, and a Ticket Margins report (sold value vs market base cost vs margin earned). |
| **Access control** | Permission-based visibility — e.g. base fare & margin are shown only to fare managers, hidden from view-only counter staff. |

---

## Tech stack

**Backend:** Node 20+, TypeScript, Express, Prisma, PostgreSQL, JWT auth, Zod validation, Helmet/CORS/rate-limit, Multer (uploads).

**Frontend:** React, TypeScript, Vite, React Router, TanStack Query & Table, React Hook Form + Zod, Radix UI + shadcn-style components, Tailwind CSS, Framer Motion, Recharts, cmdk.

---

## Getting started

> **Note on paths:** the sample repo folder name contains `&`, which breaks some npm lifecycle scripts. If you hit odd npm errors, either clone into a path **without** spaces/`&`, or invoke tools directly with `node` (e.g. `node node_modules/vite/bin/vite.js`). The commands below assume a clean path.

### 1. Install

```bash
git clone https://github.com/Irfan-CodeSynth/TRAVEL-VISA-AGENCY-ERP.git
cd TRAVEL-VISA-AGENCY-ERP
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` to real values. `.env` is gitignored; never commit secrets.

### 3. Database

Option A — **embedded Postgres** (dev helper, listens on port 5433):

```bash
npm run db:up
```

Option B — use your own PostgreSQL instance and point `DATABASE_URL` at it.

Then push the schema and seed demo data:

```bash
npm run db:push
npm run db:seed:full     # rich deterministic demo dataset
```

### 4. Run

```bash
npm run dev              # server on :4000/api/v1, client on :5173
```

Open http://localhost:5173. The seed dataset creates staff logins (password `Staff@123456`) across roles — admin, branch manager, travel agent, sales agent, accountant — so you can try the permission-based views.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run server + client concurrently. |
| `npm run build` | Build both workspaces for production. |
| `npm run db:up` | Start the embedded development Postgres. |
| `npm run db:push` | Push Prisma schema to the database. |
| `npm run db:seed` / `db:seed:full` | Seed baseline / full demo data. |
| `npm run db:studio` | Open Prisma Studio. |

---

## Project layout

```
.
├─ server/         Express + Prisma API (modules per domain)
│  └─ prisma/      schema, seed scripts, master-data imports
├─ client/         React + Vite SPA (features/ by domain)
├─ scripts/        dev DB launcher + verification/smoke scripts
└─ .env.example    template for required environment variables
```

---

## Verification

- `scripts/fare-verify.mjs` — end-to-end fare-subsystem checks (run with `node scripts/fare-verify.mjs`).
- `scripts/api-smoke.ps1` — API smoke suite (PowerShell).

---

## License

No license file is included yet — all rights reserved by the repository owner unless stated otherwise.
