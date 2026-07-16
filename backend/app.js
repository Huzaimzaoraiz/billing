const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

const authRouter = require('./routes/auth');
const studentsRouter = require('./routes/students');

app.use('/api', authRouter);
app.use('/api/students', studentsRouter);

module.exports = app;

// expose a small helper to initialize DB from the app package
const db = require('./database');
app.initDatabase = db.init;