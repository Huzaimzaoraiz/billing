const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRouter = require('./routes/auth');
const billingRouter = require('./routes/billing');
const branchesRouter = require('./routes/branches');
const coursesRouter = require('./routes/courses');
const dashboardRouter = require('./routes/dashboard');
const expensesRouter = require('./routes/expenses');
const studentsRouter = require('./routes/students');
const usersRouter = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const db = require('./database');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const { clerkMiddleware } = require('@clerk/express');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  credentials: true,
  origin: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'coaching-billing-platform' });
});

app.use('/api/auth', authRouter);
app.use('/api/billing', billingRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/users', usersRouter);

const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
app.initDatabase = db.init;
