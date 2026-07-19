const express = require('express');
const { z } = require('zod');

const { sequelize, models } = require('../database');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/roles');
const validate = require('../middleware/validate');

const router = express.Router();
const { Branch, Course, Batch, AuditLog } = models;

const idParams = z.object({ id: z.string().uuid() });
const querySchema = z.object({
  branch_id: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
});
const courseBody = z.object({
  branch_id: z.string().uuid(),
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2),
  duration_months: z.coerce.number().int().min(1).max(120).default(1),
  default_admission_fee: z.coerce.number().min(0).default(0),
  default_tuition_fee: z.coerce.number().min(0).default(0),
  is_active: z.boolean().default(true),
});
const courseUpdateBody = courseBody.omit({ branch_id: true }).partial();

router.use(authMiddleware);

router.get('/', validate({ query: querySchema }), asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'SUPER_ADMIN' && req.query.branch_id) where.branch_id = req.query.branch_id;
  if (req.user.role !== 'SUPER_ADMIN') where.branch_id = req.user.branch_id;
  if (req.query.active) where.is_active = req.query.active === 'true';

  const courses = await Course.findAll({
    where,
    include: [{ model: Branch, attributes: ['id', 'name', 'code'] }],
    order: [['name', 'ASC']],
  });

  res.json(courses);
}));

router.post('/', requireSuperAdmin, validate({ body: courseBody }), asyncHandler(async (req, res) => {
  const branch = await Branch.findByPk(req.body.branch_id);
  if (!branch) return res.status(404).json({ error: 'branch not found' });

  const course = await sequelize.transaction(async (transaction) => {
    const created = await Course.create(req.body, { transaction });
    await AuditLog.create({
      branch_id: created.branch_id,
      user_id: req.user.user_id,
      action: 'COURSE_CREATED',
      entity_type: 'Course',
      entity_id: created.id,
      details: JSON.stringify({ code: created.code, name: created.name }),
    }, { transaction });
    return created;
  });

  res.status(201).json(course);
}));

router.patch('/:id', requireSuperAdmin, validate({ params: idParams, body: courseUpdateBody }), asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) return res.status(404).json({ error: 'course not found' });

  await sequelize.transaction(async (transaction) => {
    await course.update(req.body, { transaction });
    await AuditLog.create({
      branch_id: course.branch_id,
      user_id: req.user.user_id,
      action: 'COURSE_UPDATED',
      entity_type: 'Course',
      entity_id: course.id,
      details: JSON.stringify(req.body),
    }, { transaction });
  });

  res.json(course);
}));

router.delete('/:id', requireSuperAdmin, validate({ params: idParams }), asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id, { include: [{ model: Batch }] });
  if (!course) return res.status(404).json({ error: 'course not found' });

  await sequelize.transaction(async (transaction) => {
    await course.update({ is_active: false }, { transaction });
    await AuditLog.create({
      branch_id: course.branch_id,
      user_id: req.user.user_id,
      action: 'COURSE_DISABLED',
      entity_type: 'Course',
      entity_id: course.id,
      details: JSON.stringify({ code: course.code, name: course.name }),
    }, { transaction });
  });

  res.json({ success: true });
}));

module.exports = router;
