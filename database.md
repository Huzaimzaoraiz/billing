# Database Design

## Tables

### Branch
- id (UUID, PK)
- name
- city
- address
- phone
- email
- created_at
- updated_at

### User
- id (UUID, PK)
- branch_id (FK -> Branch.id, NULL for SUPER_ADMIN)
- name
- email (unique)
- password_hash
- role (SUPER_ADMIN, MANAGER)
- is_active
- created_at
- updated_at

### Student
- id (UUID, PK)
- branch_id (FK -> Branch.id)
- name
- father_name
- phone
- parent_phone
- course
- joining_date
- status
- created_at
- updated_at

### FeePlan
- id (UUID, PK)
- student_id (FK -> Student.id, UNIQUE)
- total_fee
- one_time_fee
- tuition_fee
- discount
- final_fee
- installment_count
- created_by (FK -> User.id)
- created_at
- updated_at

### Installment
- id (UUID, PK)
- fee_plan_id (FK -> FeePlan.id)
- installment_no
- title
- amount_due
- amount_paid
- due_date
- status
- created_at
- updated_at

Remaining Amount = amount_due - amount_paid (computed, not stored).

### Payment
- id (UUID, PK)
- installment_id (FK -> Installment.id)
- amount
- payment_date
- payment_method
- transaction_reference
- receipt_number (unique)
- status
- remarks
- received_by (FK -> User.id)
- created_at
- updated_at

## Relationships

Branch
├── Users
└── Students
      └── FeePlan
             └── Installments
                    └── Payments

## Billing Model

- One-time admission fee.
- Remaining tuition divided into equal installments.
- Unlimited partial payments per installment.
