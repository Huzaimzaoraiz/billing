# Production Considerations

## Normalized Source of Truth

Payment
  -> Installment
      -> FeePlan
          -> Student
              -> Branch

Do not duplicate branch_id or student_id inside Payment.

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
5. Commit Transaction

This provides O(1) dashboard queries while keeping Payment as the immutable ledger.

## Recommended Stack

- React
- Node.js / NestJS
- PostgreSQL
- Prisma
- Redis (optional)
- Docker
- Nginx
