# Production Considerations

## Normalized Source of Truth

Payment
  -> Installment
      -> FeePlan
          -> Enrollment
              -> Student
              -> Course
              -> Batch
              -> Branch

Do not duplicate branch_id or student_id inside Payment.
Find a payment's branch by joining through Installment -> FeePlan -> Enrollment -> Branch.

## Statistics Tables

### BranchStatistics
- branch_id
- total_income
- today_income
- month_income
- total_students
- active_students
- updated_at

### SystemStatistics
- total_income
- today_income
- month_income
- total_students
- active_students
- updated_at

Whenever a payment succeeds:

1. Insert Payment
2. Update Installment
3. Update BranchStatistics
4. Update SystemStatistics
5. Write AuditLog
6. Commit Transaction

This provides O(1) dashboard queries while keeping Payment as the immutable ledger.

## Access Control

- SUPER_ADMIN can read and manage every branch.
- BRANCH_ADMIN, MANAGER, and ACCOUNTANT are limited to their own branch.
- Non-super-admin users must always have branch_id.
- API queries should always apply branch filters before returning student, enrollment, fee, or payment data.

## Migration Policy

- Use migrations for production schema changes.
- Do not run destructive sync against live data.
- Back up the database before changing enum values, money columns, or relationships.

## Recommended Stack

- React
- Node.js / NestJS
- PostgreSQL
- Prisma
- Redis (optional)
- Docker
- Nginx
