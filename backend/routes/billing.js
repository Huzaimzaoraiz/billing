const express = require('express');
const { addMonths, format } = require('date-fns');
const { z } = require('zod');

const { sequelize, models } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const {
  AuditLog,
  Batch,
  BranchStatistic,
  Course,
  Enrollment,
  FeePlan,
  Installment,
  Payment,
  Student,
  SystemStatistic,
} = models;

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
  installment_count: z.coerce.number().int().min(1).max(36),
  first_due_date: z.string().optional(),
});
const paymentBody = z.object({
  installment_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
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

function scopedBranchWhere(req) {
  return req.user.role === 'SUPER_ADMIN' ? {} : { branch_id: req.user.branch_id };
}

async function updateMoneyStats(branchId, amount, transaction) {
  const [branchStats] = await BranchStatistic.findOrCreate({ where: { branch_id: branchId }, defaults: { branch_id: branchId }, transaction });
  const systemStats = await SystemStatistic.findOne({ transaction }) || await SystemStatistic.create({}, { transaction });
  const amountNumber = Number(amount);
  const moneyPatch = (stats) => ({
    total_income: Number(stats.total_income || 0) + amountNumber,
    today_income: Number(stats.today_income || 0) + amountNumber,
    month_income: Number(stats.month_income || 0) + amountNumber,
  });

  await branchStats.update(moneyPatch(branchStats), { transaction });
  await systemStats.update(moneyPatch(systemStats), { transaction });
}

async function getScopedStudent(req, id) {
  return Student.findOne({ where: { id, ...scopedBranchWhere(req) } });
}

router.use(authMiddleware);

router.get('/accounts', validate({ query: accountQuery }), asyncHandler(async (req, res) => {
  const where = scopedBranchWhere(req);
  if (req.query.student_id) where.student_id = req.query.student_id;

  const accounts = await Enrollment.findAll({
    where,
    include: [
      { model: Student, attributes: ['id', 'name', 'phone', 'status'] },
      { model: Course, attributes: ['id', 'name', 'code'] },
      { model: Batch, attributes: ['id', 'name'], required: false },
      {
        model: FeePlan,
        include: [{
          model: Installment,
          include: [{ model: Payment, required: false }],
        }],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  res.json(accounts);
}));

router.post('/enrollments', validate({ body: enrollmentBody }), asyncHandler(async (req, res) => {
  const student = await getScopedStudent(req, req.body.student_id);
  if (!student) return res.status(404).json({ error: 'student not found' });

  const course = await Course.findOne({ where: { id: req.body.course_id, branch_id: student.branch_id, is_active: true } });
  if (!course) return res.status(404).json({ error: 'course not found for this branch' });

  if (req.body.batch_id) {
    const batch = await Batch.findOne({ where: { id: req.body.batch_id, branch_id: student.branch_id, course_id: course.id } });
    if (!batch) return res.status(404).json({ error: 'batch not found for this course' });
  }

  const account = await sequelize.transaction(async (transaction) => {
    const enrollment = await Enrollment.create({
      branch_id: student.branch_id,
      student_id: student.id,
      course_id: course.id,
      batch_id: req.body.batch_id || null,
      enrolled_on: req.body.enrolled_on || new Date(),
      status: 'ACTIVE',
    }, { transaction });

    const oneTimeCents = toCents(req.body.one_time_fee);
    const tuitionAfterDiscountCents = Math.max(toCents(req.body.tuition_fee) - toCents(req.body.discount), 0);
    const finalCents = oneTimeCents + tuitionAfterDiscountCents;
    const feePlan = await FeePlan.create({
      enrollment_id: enrollment.id,
      total_fee: fromCents(oneTimeCents + toCents(req.body.tuition_fee)),
      one_time_fee: fromCents(oneTimeCents),
      tuition_fee: fromCents(toCents(req.body.tuition_fee)),
      discount: fromCents(toCents(req.body.discount)),
      final_fee: fromCents(finalCents),
      installment_count: req.body.installment_count,
      status: 'ACTIVE',
      created_by: req.user.user_id,
    }, { transaction });

    const baseTuitionPart = Math.floor(tuitionAfterDiscountCents / req.body.installment_count);
    const remainder = tuitionAfterDiscountCents % req.body.installment_count;
    const firstDueDate = req.body.first_due_date ? new Date(req.body.first_due_date) : new Date();
    const installments = [];

    for (let index = 0; index < req.body.installment_count; index += 1) {
      const tuitionPart = baseTuitionPart + (index < remainder ? 1 : 0);
      const amountDueCents = tuitionPart + (index === 0 ? oneTimeCents : 0);
      installments.push({
        fee_plan_id: feePlan.id,
        installment_no: index + 1,
        title: index === 0 ? 'Admission and tuition' : `Tuition installment ${index + 1}`,
        amount_due: fromCents(amountDueCents),
        amount_paid: fromCents(0),
        due_date: format(addMonths(firstDueDate, index), 'yyyy-MM-dd'),
        status: 'PENDING',
      });
    }

    await Installment.bulkCreate(installments, { transaction });
    await AuditLog.create({
      branch_id: student.branch_id,
      user_id: req.user.user_id,
      action: 'ENROLLMENT_CREATED',
      entity_type: 'Enrollment',
      entity_id: enrollment.id,
      details: JSON.stringify({ student: student.name, course: course.name, final_fee: fromCents(finalCents) }),
    }, { transaction });

    return Enrollment.findByPk(enrollment.id, {
      include: [{ model: Student }, { model: Course }, { model: FeePlan, include: [{ model: Installment }] }],
      transaction,
    });
  });

  res.status(201).json(account);
}));

router.post('/payments', validate({ body: paymentBody }), asyncHandler(async (req, res) => {
  const installment = await Installment.findByPk(req.body.installment_id, {
    include: [{
      model: FeePlan,
      include: [{ model: Enrollment }],
    }],
  });

  if (!installment || !installment.FeePlan?.Enrollment) return res.status(404).json({ error: 'installment not found' });
  const branchId = installment.FeePlan.Enrollment.branch_id;
  if (req.user.role !== 'SUPER_ADMIN' && branchId !== req.user.branch_id) return res.status(404).json({ error: 'installment not found' });

  const amountCents = toCents(req.body.amount);
  const remainingCents = toCents(installment.amount_due) - toCents(installment.amount_paid);
  if (amountCents > remainingCents) return res.status(400).json({ error: 'payment is greater than remaining amount' });

  const payment = await sequelize.transaction(async (transaction) => {
    const receiptNumber = `RCPT-${format(new Date(), 'yyyyMMdd')}-${Date.now().toString().slice(-6)}`;
    const created = await Payment.create({
      installment_id: installment.id,
      amount: fromCents(amountCents),
      payment_method: req.body.payment_method,
      transaction_reference: req.body.transaction_reference || null,
      receipt_number: receiptNumber,
      status: 'SUCCESS',
      remarks: req.body.remarks || null,
      received_by: req.user.user_id,
    }, { transaction });

    const newPaidCents = toCents(installment.amount_paid) + amountCents;
    await installment.update({
      amount_paid: fromCents(newPaidCents),
      status: newPaidCents >= toCents(installment.amount_due) ? 'PAID' : 'PARTIAL',
    }, { transaction });
    await updateMoneyStats(branchId, fromCents(amountCents), transaction);
    await AuditLog.create({
      branch_id: branchId,
      user_id: req.user.user_id,
      action: 'PAYMENT_RECEIVED',
      entity_type: 'Payment',
      entity_id: created.id,
      details: JSON.stringify({ receipt_number: receiptNumber, amount: fromCents(amountCents) }),
    }, { transaction });

    return created;
  });

  res.status(201).json(payment);
}));

module.exports = router;
