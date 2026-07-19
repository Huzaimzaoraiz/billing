# Institute Billing Platform

Production-oriented billing software for multi-branch coaching institutes.

## What It Includes

- SQL database through Sequelize and SQL Server.
- Secure Express API with cookies, JWT auth, rate limiting, Helmet, request validation, and branch-aware access control.
- React operations console built with React Query, React Hook Form, Zod, Lucide icons, and Recharts.
- Super-admin-only course creation and course changes.
- Branch, course, student, enrollment, installment, payment, statistics, and audit-log structure.

## Roles

- SUPER_ADMIN: manages all branches and is the only role allowed to create, edit, or disable courses.
- BRANCH_ADMIN: manages records inside their own branch.
- MANAGER: manages students and day-to-day branch records.
- ACCOUNTANT: receives and reviews payments inside their own branch.

## SQL Setup

Copy `.env.example` to `.env` and set your SQL Server values:

```env
DB_DIALECT=mssql
DB_HOST=127.0.0.1
DB_PORT=1433
DB_NAME=billing_db
DB_USER=sa
DB_PASS=YourStrong@Password123
DB_ENCRYPT=false
JWT_SECRET=replace_with_a_strong_secret
```

For production, use migrations and keep both sync flags disabled:

```env
DB_SYNC_ALTER=false
DB_SYNC_FORCE=false
```

## Run

```bash
npm install --cache .npm-cache
npm run dev
```

Frontend: `http://127.0.0.1:5173`

Backend: `http://127.0.0.1:3000`

Default super admin is created on first startup:

- email: `admin@example.com`
- password: value of `ADMIN_PASSWORD`, or `admin` if unset

## Production Build

```bash
npm run build
npm start
```

After build, the Express server serves the compiled frontend from `dist/`.

## Verification

```bash
npm run check
npm audit --audit-level=moderate
```

Current known audit note: Sequelize depends on `uuid` with an upstream moderate advisory and no direct fix available in Sequelize 6. The app does not call the affected UUID buffer APIs directly.
