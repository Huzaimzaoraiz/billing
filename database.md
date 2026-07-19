# Production Database Design

## Core Tables

### Branch
- id (UUID, PK)
- code (unique, required)
- name
- city
- address
- phone
- email
- is_active
- created_at
- updated_at

### User
- id (UUID, PK)
- branch_id (FK -> Branch.id, NULL only for SUPER_ADMIN)
- name
- email (unique, required)
- password_hash
- role (SUPER_ADMIN, BRANCH_ADMIN, MANAGER, ACCOUNTANT)
- is_active
- created_at
- updated_at

### Course
- id (UUID, PK)
- branch_id (FK -> Branch.id)
- name
- code (unique per branch)
- duration_months
- default_admission_fee
- default_tuition_fee
- is_active
- created_at
- updated_at

### Batch
- id (UUID, PK)
- branch_id (FK -> Branch.id)
- course_id (FK -> Course.id)
- name
- start_date
- end_date
- status (PLANNED, ACTIVE, COMPLETED, CANCELLED)
- created_at
- updated_at

### Student
- id (UUID, PK)
- branch_id (FK -> Branch.id)
- name
- father_name
- phone
- parent_phone
- joining_date
- status (ACTIVE, INACTIVE, COMPLETED, DROPPED)
- created_at
- updated_at

### Enrollment
- id (UUID, PK)
- branch_id (FK -> Branch.id)
- student_id (FK -> Student.id)
- course_id (FK -> Course.id)
- batch_id (FK -> Batch.id, nullable)
- enrolled_on
- completed_on
- status (ACTIVE, COMPLETED, CANCELLED, TRANSFERRED)
- created_at
- updated_at

### FeePlan
- id (UUID, PK)
- enrollment_id (FK -> Enrollment.id, unique)
- total_fee
- one_time_fee
- tuition_fee
- discount
- final_fee
- installment_count
- status (DRAFT, ACTIVE, CLOSED, CANCELLED)
- created_by (FK -> User.id)
- created_at
- updated_at

### Installment
- id (UUID, PK)
- fee_plan_id (FK -> FeePlan.id)
- installment_no (unique per fee plan)
- title
- amount_due
- amount_paid
- due_date
- status (PENDING, PARTIAL, PAID, OVERDUE, WAIVED, CANCELLED)
- created_at
- updated_at

Remaining amount = amount_due - amount_paid.

### Payment
- id (UUID, PK)
- installment_id (FK -> Installment.id)
- amount
- payment_date
- payment_method (CASH, BANK_TRANSFER, CARD, UPI, CHEQUE, OTHER)
- transaction_reference
- receipt_number (unique, required)
- status (SUCCESS, PENDING, FAILED, VOIDED, REFUNDED)
- remarks
- received_by (FK -> User.id)
- voided_by (FK -> User.id, nullable)
- voided_at
- created_at
- updated_at

Payments should behave like a ledger. Do not delete successful payments; void or refund them with a new status/action trail.

## Reporting Tables

### BranchStatistic
- id (UUID, PK)
- branch_id (FK -> Branch.id, unique)
- total_income
- today_income
- month_income
- total_students
- active_students
- created_at
- updated_at

### SystemStatistic
- id (UUID, PK)
- total_income
- today_income
- month_income
- total_students
- active_students
- created_at
- updated_at

## Audit Table

### AuditLog
- id (UUID, PK)
- branch_id (FK -> Branch.id, nullable)
- user_id (FK -> User.id, nullable)
- action
- entity_type
- entity_id
- details
- created_at
- updated_at

## Relationships

Branch
├── Users
├── Courses
│   └── Batches
├── Students
│   └── Enrollments
│       ├── Course
│       ├── Batch
│       └── FeePlan
│           └── Installments
│               └── Payments
├── BranchStatistic
└── AuditLogs

User
├── Created FeePlans
├── Received Payments
├── Voided Payments
└── AuditLogs

## Billing Flow

1. Create Branch.
2. Create Users for that branch.
3. Create Courses and optional Batches.
4. Create Student.
5. Create Enrollment for the student's course/batch.
6. Create FeePlan for that enrollment.
7. Generate Installments.
8. Record Payments against installments.
9. Update installment amount_paid/status inside the same transaction.
10. Update BranchStatistic and SystemStatistic inside the same transaction.
11. Write AuditLog for important changes.

## Production Rules

- Managers, accountants, and branch admins must only access records from their own branch.
- SUPER_ADMIN can access every branch.
- A non-super-admin user must always have a branch_id.
- Use fixed enum statuses instead of free text.
- Keep Payment as the source ledger for money received.
- Keep Installment.amount_paid only as a cached total that is updated transactionally.
- Use database migrations for production changes; do not use destructive sync on live data.
