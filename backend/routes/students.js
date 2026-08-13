const express = require('express');
const { z } = require('zod');

const { prisma } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { branchWhere, canAccessBranch } = require('./shared');

const router = express.Router();

const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'DROPPED'];
const idParams = z.object({ id: z.string().uuid() });
const listQuery = z.object({
  status: z.enum(STUDENT_STATUSES).optional(),
  branch_id: z.string().uuid().optional(),
});
const studentBody = z.object({
  branch_id: z.string().uuid().optional(),
  name: z.string().trim().min(2),
  father_name: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  parent_phone: z.string().trim().optional().nullable(),
  joining_date: z.string().trim().optional().nullable(),
  status: z.enum(STUDENT_STATUSES).default('ACTIVE'),
});
const studentUpdateBody = studentBody.omit({ branch_id: true }).partial();

async function updateStudentStats(branchId, tx) {
  const [totalStudents, activeStudents] = await Promise.all([
    tx.student.count({ where: { branch_id: branchId } }),
    tx.student.count({ where: { branch_id: branchId, status: 'ACTIVE' } }),
  ]);

  let stats = await tx.branchStatistic.findUnique({ where: { branch_id: branchId } });
  if (!stats) {
    stats = await tx.branchStatistic.create({ data: { branch_id: branchId } });
  }

  await tx.branchStatistic.update({
    where: { branch_id: branchId },
    data: { total_students: totalStudents, active_students: activeStudents },
  });
}

router.use(authMiddleware);

router.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const where = branchWhere(req.user, { branchId: req.user.role === 'SUPER_ADMIN' ? req.query.branch_id : null });
  if (req.query.status) where.status = req.query.status;

  const students = await prisma.student.findMany({
    where,
    include: { Branch: { select: { id: true, name: true, code: true } } },
    orderBy: { created_at: 'desc' },
  });

  res.json(students);
}));

router.post('/', validate({ body: studentBody }), asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role !== 'SUPER_ADMIN') data.branch_id = req.user.branch_id;
  if (!data.branch_id) return res.status(400).json({ error: 'branch_id is required' });

  const branch = await prisma.branch.findUnique({ where: { id: data.branch_id } });
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  if (data.joining_date) {
    data.joining_date = new Date(data.joining_date);
  }

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({ data });
    await updateStudentStats(created.branch_id, tx);
    await tx.auditLog.create({
      data: {
        branch_id: created.branch_id,
        user_id: req.user.user_id,
        action: 'STUDENT_CREATED',
        entity_type: 'Student',
        entity_id: created.id,
        details: JSON.stringify({ name: created.name }),
      }
    });
    return created;
  });

  res.status(201).json(student);
}));

router.get('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({
    where: branchWhere(req.user, { where: { id: req.params.id } }),
    include: { Branch: { select: { id: true, name: true, code: true } } },
  });
  if (!student) return res.status(404).json({ error: 'student not found' });
  res.json(student);
}));

router.patch('/:id', validate({ params: idParams, body: studentUpdateBody }), asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({ where: branchWhere(req.user, { where: { id: req.params.id } }) });
  if (!student) return res.status(404).json({ error: 'student not found' });

  const data = { ...req.body };
  if (data.joining_date) data.joining_date = new Date(data.joining_date);

  const updatedStudent = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: student.id },
      data,
    });
    await updateStudentStats(student.branch_id, tx);
    await tx.auditLog.create({
      data: {
        branch_id: student.branch_id,
        user_id: req.user.user_id,
        action: 'STUDENT_UPDATED',
        entity_type: 'Student',
        entity_id: student.id,
        details: JSON.stringify(req.body),
      }
    });
    return updated;
  });

  res.json(updatedStudent);
}));

router.delete('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const student = await prisma.student.findFirst({ where: branchWhere(req.user, { where: { id: req.params.id } }) });
  if (!student) return res.status(404).json({ error: 'student not found' });

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: student.id },
      data: { status: 'INACTIVE' },
    });
    await updateStudentStats(student.branch_id, tx);
    await tx.auditLog.create({
      data: {
        branch_id: student.branch_id,
        user_id: req.user.user_id,
        action: 'STUDENT_DEACTIVATED',
        entity_type: 'Student',
        entity_id: student.id,
        details: JSON.stringify({ name: student.name }),
      }
    });
  });

  res.json({ success: true });
}));

module.exports = router;
