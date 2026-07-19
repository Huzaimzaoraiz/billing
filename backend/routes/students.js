const express = require('express');
const { z } = require('zod');

const { sequelize, models } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();
const { Branch, Student, BranchStatistic, AuditLog } = models;

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

function scopedStudentWhere(req, extra = {}) {
  const where = { ...extra };
  if (req.user.role !== 'SUPER_ADMIN') where.branch_id = req.user.branch_id;
  return where;
}

async function updateStudentStats(branchId, transaction) {
  const [totalStudents, activeStudents] = await Promise.all([
    Student.count({ where: { branch_id: branchId }, transaction }),
    Student.count({ where: { branch_id: branchId, status: 'ACTIVE' }, transaction }),
  ]);

  const [stats] = await BranchStatistic.findOrCreate({ where: { branch_id: branchId }, defaults: { branch_id: branchId }, transaction });
  await stats.update({ total_students: totalStudents, active_students: activeStudents }, { transaction });
}

router.use(authMiddleware);

router.get('/', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  const where = scopedStudentWhere(req);
  if (req.user.role === 'SUPER_ADMIN' && req.query.branch_id) where.branch_id = req.query.branch_id;
  if (req.query.status) where.status = req.query.status;

  const students = await Student.findAll({
    where,
    include: [{ model: Branch, attributes: ['id', 'name', 'code'] }],
    order: [['created_at', 'DESC']],
  });

  res.json(students);
}));

router.post('/', validate({ body: studentBody }), asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role !== 'SUPER_ADMIN') data.branch_id = req.user.branch_id;
  if (!data.branch_id) return res.status(400).json({ error: 'branch_id is required' });

  const branch = await Branch.findByPk(data.branch_id);
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  const student = await sequelize.transaction(async (transaction) => {
    const created = await Student.create(data, { transaction });
    await updateStudentStats(created.branch_id, transaction);
    await AuditLog.create({
      branch_id: created.branch_id,
      user_id: req.user.user_id,
      action: 'STUDENT_CREATED',
      entity_type: 'Student',
      entity_id: created.id,
      details: JSON.stringify({ name: created.name }),
    }, { transaction });
    return created;
  });

  res.status(201).json(student);
}));

router.get('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    where: scopedStudentWhere(req, { id: req.params.id }),
    include: [{ model: Branch, attributes: ['id', 'name', 'code'] }],
  });
  if (!student) return res.status(404).json({ error: 'student not found' });
  res.json(student);
}));

router.patch('/:id', validate({ params: idParams, body: studentUpdateBody }), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: scopedStudentWhere(req, { id: req.params.id }) });
  if (!student) return res.status(404).json({ error: 'student not found' });

  await sequelize.transaction(async (transaction) => {
    await student.update(req.body, { transaction });
    await updateStudentStats(student.branch_id, transaction);
    await AuditLog.create({
      branch_id: student.branch_id,
      user_id: req.user.user_id,
      action: 'STUDENT_UPDATED',
      entity_type: 'Student',
      entity_id: student.id,
      details: JSON.stringify(req.body),
    }, { transaction });
  });

  res.json(student);
}));

router.delete('/:id', validate({ params: idParams }), asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: scopedStudentWhere(req, { id: req.params.id }) });
  if (!student) return res.status(404).json({ error: 'student not found' });

  await sequelize.transaction(async (transaction) => {
    await student.update({ status: 'INACTIVE' }, { transaction });
    await updateStudentStats(student.branch_id, transaction);
    await AuditLog.create({
      branch_id: student.branch_id,
      user_id: req.user.user_id,
      action: 'STUDENT_DEACTIVATED',
      entity_type: 'Student',
      entity_id: student.id,
      details: JSON.stringify({ name: student.name }),
    }, { transaction });
  });

  res.json({ success: true });
}));

module.exports = router;
