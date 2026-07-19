# System Architecture

Browser
  |
React Operations Console
  |
Express API
  |
JWT Cookie Authentication
  |
Role and Branch Authorization
  |
Validated Business Routes
  |
Sequelize
  |
SQL Server

## Frontend

- React for the application shell and views.
- React Query for server state and refresh.
- React Hook Form and Zod for forms and validation.
- Lucide React for interface icons.
- Recharts for operational dashboards.

## Backend

- Express API with modular routes.
- Helmet, CORS, cookie parser, morgan, and login rate limiting.
- Zod request validation.
- Sequelize models backed by SQL Server.
- Centralized error handling.

## Authorization

SUPER_ADMIN
- Access every branch.
- Create, edit, and disable courses for every branch.
- Create branches.

BRANCH_ADMIN, MANAGER, ACCOUNTANT
- Access only records belonging to their branch.
- Cannot create, edit, or disable courses.

## Billing Flow

Payment received
  |
Create Payment
  |
Update Installment amount_paid and status
  |
Update BranchStatistic
  |
Update SystemStatistic
  |
Write AuditLog
  |
Commit Transaction

## Branch Isolation

Every operational record joins back to Branch.

Managers and branch users are filtered by:

Student.branch_id == User.branch_id

Payment branch is resolved through:

Payment -> Installment -> FeePlan -> Enrollment -> Branch

SUPER_ADMIN bypasses branch filtering.
