const express = require('express');
const { randomUUID } = require('crypto');
const { format } = require('date-fns');
const { z } = require('zod');

const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { branchWhere } = require('./shared');

const router = express.Router();

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE', 'OTHER'];
const accountQuery = z.object({ student_id: z.string().uuid().optional() });
const enrollmentBody = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid(),
  batch_id: z.string().uuid().optional().nullable(),
  enrolled_on: z.string().optional(),
  one_time_fee: z.coerce.number().min(0).default(0),
  tuition_fee: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});
const paymentBody = z.object({
  fee_plan_id: z.string().uuid(),
  amount: z.coerce.number(),
  payment_method: z.enum(PAYMENT_METHODS).default('CASH'),
  transaction_reference: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
});

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return (value / 100).toFixed(2);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = startOfToday();
  date.setDate(1);
  return date;
}

async function sumSuccessfulPayments({ branchId, from, tx }) {
  const where = { status: 'SUCCESS' };
  if (from) where.payment_date = { gte: from };
  if (branchId) {
    where.FeePlan = { Enrollment: { branch_id: branchId } };
  }

  const result = await tx.payment.aggregate({
    _sum: { amount: true },
    where
  });
  return Number(result._sum.amount || 0);
}

async function syncMoneyStats(branchId, tx) {
  let branchStats = await tx.branchStatistic.findUnique({ where: { branch_id: branchId } });
  if (!branchStats) {
    branchStats = await tx.branchStatistic.create({ data: { branch_id: branchId } });
  }
  
  let systemStats = await tx.systemStatistic.findFirst();
  if (!systemStats) {
    systemStats = await tx.systemStatistic.create({ data: {} });
  }

  const [branchTotal, branchToday, branchMonth, systemTotal, systemToday, systemMonth] = await Promise.all([
    sumSuccessfulPayments({ branchId, tx }),
    sumSuccessfulPayments({ branchId, from: startOfToday(), tx }),
    sumSuccessfulPayments({ branchId, from: startOfMonth(), tx }),
    sumSuccessfulPayments({ tx }),
    sumSuccessfulPayments({ from: startOfToday(), tx }),
    sumSuccessfulPayments({ from: startOfMonth(), tx }),
  ]);

  await tx.branchStatistic.update({
    where: { branch_id: branchId },
    data: { total_income: branchTotal, today_income: branchToday, month_income: branchMonth }
  });
  
  await tx.systemStatistic.update({
    where: { id: systemStats.id },
    data: { total_income: systemTotal, today_income: systemToday, month_income: systemMonth }
  });
}

async function getScopedStudent(req, id) {
  const where = { id };
  if (req.user.role !== 'SUPER_ADMIN') {
    where.branch_id = req.user.branch_id;
  }
  return prisma.student.findFirst({ where });
}

router.use(authMiddleware);

router.get('/accounts', validate({ query: accountQuery }), asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role !== 'SUPER_ADMIN') {
    where.branch_id = req.user.branch_id;
  }
  if (req.query.student_id) where.student_id = req.query.student_id;

  const accounts = await prisma.enrollment.findMany({
    where,
    include: {
      Student: { select: { id: true, name: true, phone: true, status: true } },
      Course: { select: { id: true, name: true, code: true } },
      Batch: { select: { id: true, name: true } },
      FeePlan: {
        include: {
          Payments: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  res.json(accounts);
}));

router.post('/enrollments', validate({ body: enrollmentBody }), asyncHandler(async (req, res) => {
  const student = await getScopedStudent(req, req.body.student_id);
  if (!student) return res.status(404).json({ error: 'student not found' });

  const course = await prisma.course.findFirst({ where: { id: req.body.course_id, branch_id: student.branch_id, is_active: true } });
  if (!course) return res.status(404).json({ error: 'course not found for this branch' });

  if (req.body.batch_id) {
    const batch = await prisma.batch.findFirst({ where: { id: req.body.batch_id, branch_id: student.branch_id, course_id: course.id } });
    if (!batch) return res.status(404).json({ error: 'batch not found for this course' });
  }

  const account = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.create({
      data: {
        branch_id: student.branch_id,
        student_id: student.id,
        course_id: course.id,
        batch_id: req.body.batch_id || null,
        enrolled_on: req.body.enrolled_on ? new Date(req.body.enrolled_on) : new Date(),
        status: 'ACTIVE',
      }
    });

    const oneTimeCents = toCents(req.body.one_time_fee);
    const tuitionAfterDiscountCents = Math.max(toCents(req.body.tuition_fee) - toCents(req.body.discount), 0);
    const finalCents = oneTimeCents + tuitionAfterDiscountCents;
    
    await tx.feePlan.create({
      data: {
        enrollment_id: enrollment.id,
        total_fee: fromCents(oneTimeCents + toCents(req.body.tuition_fee)),
        one_time_fee: fromCents(oneTimeCents),
        tuition_fee: fromCents(toCents(req.body.tuition_fee)),
        discount: fromCents(toCents(req.body.discount)),
        final_fee: fromCents(finalCents),
        amount_paid: 0,
        status: finalCents === 0 ? 'PAID' : 'PARTIAL',
        created_by: req.user.user_id,
      }
    });

    await tx.auditLog.create({
      data: {
        branch_id: student.branch_id,
        user_id: req.user.user_id,
        action: 'ENROLLMENT_CREATED',
        entity_type: 'Enrollment',
        entity_id: enrollment.id,
        details: JSON.stringify({ student: student.name, course: course.name, final_fee: fromCents(finalCents) }),
      }
    });

    return tx.enrollment.findUnique({
      where: { id: enrollment.id },
      include: { Student: true, Course: true, FeePlan: { include: { Payments: true } } }
    });
  });

  res.status(201).json(account);
}));

router.post('/payments', validate({ body: paymentBody }), asyncHandler(async (req, res) => {
  const payment = await prisma.$transaction(async (tx) => {
    const feePlan = await tx.feePlan.findUnique({
      where: { id: req.body.fee_plan_id },
      include: { Enrollment: true },
    });

    if (!feePlan || !feePlan.Enrollment) {
      const error = new Error('fee plan not found');
      error.status = 404;
      throw error;
    }

    const branchId = feePlan.Enrollment.branch_id;
    if (req.user.role !== 'SUPER_ADMIN' && branchId !== req.user.branch_id) {
      const error = new Error('fee plan not found');
      error.status = 404;
      throw error;
    }

    const amountCents = toCents(req.body.amount);
    const remainingCents = toCents(feePlan.final_fee) - toCents(feePlan.amount_paid);
    
    if (remainingCents <= 0) {
      const error = new Error('this fee plan is already paid in full');
      error.status = 400;
      throw error;
    }
    if (amountCents > remainingCents) {
      const error = new Error('payment is greater than the remaining amount');
      error.status = 400;
      throw error;
    }

    const receiptNumber = `RCPT-${format(new Date(), 'yyyyMMdd')}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const created = await tx.payment.create({
      data: {
        fee_plan_id: feePlan.id,
        amount: fromCents(amountCents),
        payment_method: req.body.payment_method,
        transaction_reference: req.body.transaction_reference || null,
        receipt_number: receiptNumber,
        status: 'SUCCESS',
        remarks: req.body.remarks || null,
        received_by: req.user.user_id,
      }
    });

    const newPaidCents = toCents(feePlan.amount_paid) + amountCents;
    await tx.feePlan.update({
      where: { id: feePlan.id },
      data: {
        amount_paid: fromCents(newPaidCents),
        status: newPaidCents >= toCents(feePlan.final_fee) ? 'PAID' : 'PARTIAL',
      }
    });
    
    await syncMoneyStats(branchId, tx);
    
    await tx.auditLog.create({
      data: {
        branch_id: branchId,
        user_id: req.user.user_id,
        action: 'PAYMENT_RECEIVED',
        entity_type: 'Payment',
        entity_id: created.id,
        details: JSON.stringify({ receipt_number: receiptNumber, amount: fromCents(amountCents) }),
      }
    });

    return created;
  });

  res.status(201).json(payment);
}));

module.exports = router;
