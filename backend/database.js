const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const {
  DATABASE_URL,
  DB_DIALECT = 'mssql',
  DB_HOST = '127.0.0.1',
  DB_PORT = '1433',
  DB_NAME = 'billing_db',
  DB_USER = 'sa',
  DB_PASS = '',
  DB_ENCRYPT = 'false',
  DB_POOL_MAX = '10',
} = process.env;

const pool = { max: Number(DB_POOL_MAX), min: 0, acquire: 30000, idle: 10000 };

let sequelize;
if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, { dialect: DB_DIALECT, pool, logging: false, dialectOptions: { options: { encrypt: DB_ENCRYPT === 'true' } } });
} else {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: DB_DIALECT,
    dialectOptions: { options: { encrypt: DB_ENCRYPT === 'true' } },
    pool,
    logging: false,
  });
}

const common = { timestamps: true, underscored: true };

const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  city: DataTypes.STRING,
  address: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
}, { ...common, tableName: 'branches' });

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: true },
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('SUPER_ADMIN', 'MANAGER'), allowNull: false, defaultValue: 'MANAGER' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { ...common, tableName: 'users' });

const Student = sequelize.define('Student', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  father_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  parent_phone: DataTypes.STRING,
  course: DataTypes.STRING,
  joining_date: DataTypes.DATEONLY,
  status: DataTypes.STRING,
}, { ...common, tableName: 'students' });

const FeePlan = sequelize.define('FeePlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  student_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  total_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  one_time_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  tuition_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  final_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  installment_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, { ...common, tableName: 'fee_plans' });

const Installment = sequelize.define('Installment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fee_plan_id: { type: DataTypes.UUID, allowNull: false },
  installment_no: { type: DataTypes.INTEGER, allowNull: false },
  title: DataTypes.STRING,
  amount_due: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  amount_paid: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  due_date: DataTypes.DATEONLY,
  status: DataTypes.STRING,
}, { ...common, tableName: 'installments' });

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  installment_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  payment_method: DataTypes.STRING,
  transaction_reference: DataTypes.STRING,
  receipt_number: { type: DataTypes.STRING, unique: true },
  status: DataTypes.STRING,
  remarks: DataTypes.TEXT,
  received_by: { type: DataTypes.UUID, allowNull: true },
}, { ...common, tableName: 'payments' });

// Associations
Branch.hasMany(User, { foreignKey: 'branch_id' });
User.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Student, { foreignKey: 'branch_id' });
Student.belongsTo(Branch, { foreignKey: 'branch_id' });

Student.hasOne(FeePlan, { foreignKey: 'student_id' });
FeePlan.belongsTo(Student, { foreignKey: 'student_id' });

FeePlan.hasMany(Installment, { foreignKey: 'fee_plan_id' });
Installment.belongsTo(FeePlan, { foreignKey: 'fee_plan_id' });

Installment.hasMany(Payment, { foreignKey: 'installment_id' });
Payment.belongsTo(Installment, { foreignKey: 'installment_id' });

User.hasMany(Payment, { foreignKey: 'received_by' });
Payment.belongsTo(User, { foreignKey: 'received_by' });

async function init({ force = false, alter = false, adminPassword } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ force, alter });
  const admin = await User.findOne({ where: { email: 'admin@example.com' } });
  if (!admin) {
    await User.create({ name: 'admin', email: 'admin@example.com', password_hash: await bcrypt.hash(adminPassword || process.env.ADMIN_PASSWORD || 'admin', 10), role: 'SUPER_ADMIN' });
  }
}

module.exports = {
  sequelize,
  init,
  models: { Branch, User, Student, FeePlan, Installment, Payment },
  // helpers
  getUserByUsername: (username) => {
    const { Op } = require('sequelize');
    return User.findOne({ where: { [Op.or]: [{ name: username }, { email: username }, { username }] } });
  },
  createUser: async ({ name, email, password, role = 'MANAGER', branch_id = null }) => User.create({ name, email, password_hash: await bcrypt.hash(password, 10), role, branch_id }),
  listStudents: (opts = {}) => Student.findAll(opts),
  getStudent: (id) => Student.findByPk(id),
  createStudent: (data) => Student.create(data),
  updateStudent: async (id, data) => { const s = await Student.findByPk(id); if (!s) return null; return s.update(data); },
  deleteStudent: async (id) => { const s = await Student.findByPk(id); if (!s) return 0; await s.destroy(); return 1; },
};
