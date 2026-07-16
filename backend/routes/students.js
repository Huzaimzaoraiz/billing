const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Protected routes for basic student CRUD
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const students = await db.listStudents();
  res.json(students);
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const s = await db.createStudent(data);
    res.status(201).json(s);
  } catch (err) {
    console.error('create student error', err);
    res.status(400).json({ error: 'invalid data' });
  }
});

router.get('/:id', async (req, res) => {
  const s = await db.getStudent(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json(s);
});

router.put('/:id', async (req, res) => {
  const updated = await db.updateStudent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const deleted = await db.deleteStudent(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'not found' });
  res.json({ success: true });
});

module.exports = router;
