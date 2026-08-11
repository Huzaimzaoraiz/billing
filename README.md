# Institute Billing Platform

Production-oriented billing software for multi-branch coaching institutes.

## What It Includes

- SQL database through Sequelize and SQL Server.
- Secure Express API with cookies, JWT auth, rate limiting, Helmet, request validation, and branch-aware access control.
- React operations console built with React Query, React Hook Form, Zod, Lucide icons, and Recharts.
- Super-admin-only course creation and course changes.
- Branch, course, student, enrollment, installment, payment, statistics, and audit-log structure.

## Roles

- SUPER_ADMIN: manages all branches and can create, edit, or disable courses.
- STAFF: branch-specific users who manage branch records inside their own branch.

## SQL Setup

Copy `.env.example` to `.env` and set your Postgres values:

```env
DB_DIALECT=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASS=YourSecurePassword
DB_ENCRYPT=false
JWT_SECRET=a_random_secret_of_at_least_32_characters
BOOTSTRAP_ADMIN_EMAIL=admin@your-domain.example
BOOTSTRAP_ADMIN_PASSWORD=a_strong_initial_password
VITE_APP_NAME=Institute Billing
VITE_LOCALE=en-IN
VITE_CURRENCY=INR
```

For production, use migrations and keep both sync flags disabled:

```env
DB_SYNC_ALTER=false
DB_SYNC_FORCE=false
```

If you want to run the database locally with Docker, use:

```bash
docker run --name postgres-container -e POSTGRES_PASSWORD=YourSecurePassword -e POSTGRES_DB=mydb -p 5432:5432 -d postgres:latest
```

## Run

```bash
npm install --cache .npm-cache
npm run dev
```

Frontend: `http://127.0.0.1:5173` unless Vite picks the next free port, such as `5174`.

Backend: `http://127.0.0.1:3001` in development.

Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` before the first startup to create the initial super admin. These values are only used when that account does not already exist; remove them from the runtime environment after setup.

## Add Staff Users

Create the branch first from the Branches screen. Then use its branch code to add staff:

```bash
npm run user:create -- --name "Staff Name" --email staff@example.com --password staff123 --role STAFF --branch-code 001
```

Use `STAFF` for `--role`.

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
