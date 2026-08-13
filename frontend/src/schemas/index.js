import { z } from 'zod';

export const branchSchema = z.object({
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
});

export const courseSchema = z.object({
  branch_id: z.string().uuid('Choose a branch'),
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  duration_months: z.coerce.number().int().min(1),
  default_admission_fee: z.coerce.number().min(0),
  default_tuition_fee: z.coerce.number().min(0),
});

export const studentSchema = z.object({
  branch_id: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  father_name: z.string().optional(),
  phone: z.string().optional(),
  parent_phone: z.string().optional(),
  joining_date: z.string().optional(),
});

export const userSchema = z.object({
  branch_id: z.string().uuid('Choose a branch'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  role: z.enum(['STAFF']),
});

export const enrollmentSchema = z.object({
  student_id: z.string().uuid('Choose a student'),
  course_id: z.string().uuid('Choose a course'),
  one_time_fee: z.coerce.number().min(0),
  tuition_fee: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
});

export const paymentSchema = z.object({
  fee_plan_id: z.string().uuid('Choose a fee plan'),
  amount: z.coerce.number().positive('Amount is required'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE', 'OTHER']),
  transaction_reference: z.string().optional(),
  remarks: z.string().optional(),
});
