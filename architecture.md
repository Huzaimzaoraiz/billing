# System Architecture

Internet
    |
Frontend (React)
    |
Backend API (Node.js / NestJS)
    |
Authentication (JWT)
    |
Authorization (Role + Branch)
    |
Business Services
    |
PostgreSQL

## Authorization

SUPER_ADMIN
- Access every branch.

MANAGER
- Access only students belonging to their branch.

## Payment Flow

Payment Received
    |
Save Payment
    |
Update Installment
    |
Update Statistics
    |
Commit Transaction

## Branch Isolation

Every Student belongs to exactly one Branch.

Managers are filtered by:
Student.branch_id == Manager.branch_id

Super Admin bypasses branch filtering.
