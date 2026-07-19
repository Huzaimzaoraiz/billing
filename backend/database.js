const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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
const money = { type: DataTypes.DECIMAL(12,2), defaultValue: 0, allowNull: false };
const ROLES = ['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER', 'ACCOUNTANT'];
const BATCH_STATUSES = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'COMPLETED', 'DROPPED'];
const ENROLLMENT_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED', 'TRANSFERRED'];
const FEE_PLAN_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'];
const INSTALLMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED'];
const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE', 'OTHER'];
const PAYMENT_STATUSES = ['SUCCESS', 'PENDING', 'FAILED', 'VOIDED', 'REFUNDED'];
const enumText = (values, defaultValue, length = 40) => ({
  type: DataTypes.STRING(length),
  allowNull: false,
  defaultValue,
  validate: { isIn: [values] },
});

const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  city: DataTypes.STRING,
  address: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
}, { ...common, tableName: 'branches', indexes: [{ unique: true, fields: ['code'] }] });

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: enumText(ROLES, 'MANAGER'),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
}, {
  ...common,
  tableName: 'users',
  indexes: [{ unique: true, fields: ['email'] }, { fields: ['branch_id', 'role'] }],
  validate: {
    branchRequiredForBranchRoles() {
      if (this.role !== 'SUPER_ADMIN' && !this.branch_id) {
        throw new Error('branch_id is required for branch users');
      }
    },
  },
});

const Course = sequelize.define('Course', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING(30), allowNull: false },
  duration_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  default_admission_fee: money,
  default_tuition_fee: money,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: false },
}, { ...common, tableName: 'courses', indexes: [{ unique: true, fields: ['branch_id', 'code'] }] });

const Batch = sequelize.define('Batch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false },
  course_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY,
  status: enumText(BATCH_STATUSES, 'PLANNED'),
}, { ...common, tableName: 'batches', indexes: [{ fields: ['branch_id', 'course_id'] }, { fields: ['status'] }] });

const Student = sequelize.define('Student', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  father_name: DataTypes.STRING,
  phone: DataTypes.STRING,
  parent_phone: DataTypes.STRING,
  joining_date: DataTypes.DATEONLY,
  status: enumText(STUDENT_STATUSES, 'ACTIVE'),
}, { ...common, tableName: 'students', indexes: [{ fields: ['branch_id', 'status'] }, { fields: ['phone'] }] });

const Enrollment = sequelize.define('Enrollment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false },
  student_id: { type: DataTypes.UUID, allowNull: false },
  course_id: { type: DataTypes.UUID, allowNull: false },
  batch_id: { type: DataTypes.UUID, allowNull: true },
  enrolled_on: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  completed_on: DataTypes.DATEONLY,
  status: enumText(ENROLLMENT_STATUSES, 'ACTIVE'),
}, { ...common, tableName: 'enrollments', indexes: [{ fields: ['branch_id', 'status'] }, { fields: ['student_id'] }, { fields: ['course_id'] }] });

const FeePlan = sequelize.define('FeePlan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  enrollment_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  total_fee: money,
  one_time_fee: money,
  tuition_fee: money,
  discount: money,
  final_fee: money,
  installment_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  status: enumText(FEE_PLAN_STATUSES, 'DRAFT'),
  created_by: { type: DataTypes.UUID, allowNull: true },
}, { ...common, tableName: 'fee_plans', indexes: [{ unique: true, fields: ['enrollment_id'] }, { fields: ['status'] }] });

const Installment = sequelize.define('Installment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fee_plan_id: { type: DataTypes.UUID, allowNull: false },
  installment_no: { type: DataTypes.INTEGER, allowNull: false },
  title: DataTypes.STRING,
  amount_due: money,
  amount_paid: money,
  due_date: DataTypes.DATEONLY,
  status: enumText(INSTALLMENT_STATUSES, 'PENDING'),
}, { ...common, tableName: 'installments', indexes: [{ unique: true, fields: ['fee_plan_id', 'installment_no'] }, { fields: ['due_date', 'status'] }] });

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  installment_id: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  payment_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  payment_method: enumText(PAYMENT_METHODS, 'CASH'),
  transaction_reference: DataTypes.STRING,
  receipt_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: enumText(PAYMENT_STATUSES, 'SUCCESS'),
  remarks: DataTypes.TEXT,
  received_by: { type: DataTypes.UUID, allowNull: true },
  voided_by: { type: DataTypes.UUID, allowNull: true },
  voided_at: DataTypes.DATE,
}, { ...common, tableName: 'payments', indexes: [{ unique: true, fields: ['receipt_number'] }, { fields: ['installment_id', 'status'] }, { fields: ['payment_date'] }] });

const BranchStatistic = sequelize.define('BranchStatistic', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  total_income: money,
  today_income: money,
  month_income: money,
  total_students: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  active_students: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
}, { ...common, tableName: 'branch_statistics', indexes: [{ unique: true, fields: ['branch_id'] }] });

const SystemStatistic = sequelize.define('SystemStatistic', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  total_income: money,
  today_income: money,
  month_income: money,
  total_students: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  active_students: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
}, { ...common, tableName: 'system_statistics' });

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  branch_id: { type: DataTypes.UUID, allowNull: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  action: { type: DataTypes.STRING(80), allowNull: false },
  entity_type: { type: DataTypes.STRING(80), allowNull: false },
  entity_id: { type: DataTypes.UUID, allowNull: true },
  details: DataTypes.TEXT,
}, { ...common, tableName: 'audit_logs', indexes: [{ fields: ['branch_id', 'created_at'] }, { fields: ['entity_type', 'entity_id'] }] });

// Associations
Branch.hasMany(User, { foreignKey: 'branch_id' });
User.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Course, { foreignKey: 'branch_id' });
Course.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Batch, { foreignKey: 'branch_id' });
Batch.belongsTo(Branch, { foreignKey: 'branch_id' });
Course.hasMany(Batch, { foreignKey: 'course_id' });
Batch.belongsTo(Course, { foreignKey: 'course_id' });

Branch.hasMany(Student, { foreignKey: 'branch_id' });
Student.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(Enrollment, { foreignKey: 'branch_id' });
Enrollment.belongsTo(Branch, { foreignKey: 'branch_id' });
Student.hasMany(Enrollment, { foreignKey: 'student_id' });
Enrollment.belongsTo(Student, { foreignKey: 'student_id' });
Course.hasMany(Enrollment, { foreignKey: 'course_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });
Batch.hasMany(Enrollment, { foreignKey: 'batch_id' });
Enrollment.belongsTo(Batch, { foreignKey: 'batch_id' });

Enrollment.hasOne(FeePlan, { foreignKey: 'enrollment_id' });
FeePlan.belongsTo(Enrollment, { foreignKey: 'enrollment_id' });

FeePlan.hasMany(Installment, { foreignKey: 'fee_plan_id' });
Installment.belongsTo(FeePlan, { foreignKey: 'fee_plan_id' });

Installment.hasMany(Payment, { foreignKey: 'installment_id' });
Payment.belongsTo(Installment, { foreignKey: 'installment_id' });

User.hasMany(Payment, { foreignKey: 'received_by' });
Payment.belongsTo(User, { foreignKey: 'received_by' });
User.hasMany(Payment, { foreignKey: 'voided_by', as: 'VoidedPayments' });
Payment.belongsTo(User, { foreignKey: 'voided_by', as: 'VoidedBy' });

User.hasMany(FeePlan, { foreignKey: 'created_by' });
FeePlan.belongsTo(User, { foreignKey: 'created_by' });

Branch.hasOne(BranchStatistic, { foreignKey: 'branch_id' });
BranchStatistic.belongsTo(Branch, { foreignKey: 'branch_id' });

Branch.hasMany(AuditLog, { foreignKey: 'branch_id' });
AuditLog.belongsTo(Branch, { foreignKey: 'branch_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

async function init({ force = false, alter = false, adminPassword } = {}) {
  await sequelize.authenticate();
  await sequelize.sync({ force, alter });
  const admin = await User.findOne({ where: { email: 'admin@example.com' } });
  if (!admin) {
    await User.create({ name: 'admin', email: 'admin@example.com', password_hash: await bcrypt.hash(adminPassword || process.env.ADMIN_PASSWORD || 'admin', 10), role: 'SUPER_ADMIN' });
  }
  const systemStatistic = await SystemStatistic.findOne();
  if (!systemStatistic) await SystemStatistic.create({});
}

module.exports = {
  sequelize,
  init,
  models: { Branch, User, Course, Batch, Student, Enrollment, FeePlan, Installment, Payment, BranchStatistic, SystemStatistic, AuditLog },
  // helpers
  getUserByUsername: (username) => {
    const { Op } = require('sequelize');
    return User.findOne({ where: { [Op.or]: [{ name: username }, { email: username }] } });
  },
  createUser: async ({ name, email, password, role = 'MANAGER', branch_id = null }) => User.create({ name, email, password_hash: await bcrypt.hash(password, 10), role, branch_id }),
  listStudents: ({ user, ...opts } = {}) => {
    const where = { ...(opts.where || {}) };
    if (user?.role !== 'SUPER_ADMIN') where.branch_id = user.branch_id;
    return Student.findAll({ ...opts, where });
  },
  getStudent: async (id, user) => {
    const student = await Student.findByPk(id);
    if (!student) return null;
    if (user?.role !== 'SUPER_ADMIN' && student.branch_id !== user?.branch_id) return null;
    return student;
  },
  createStudent: (data) => Student.create(data),
  updateStudent: async (id, data, user) => { const s = await module.exports.getStudent(id, user); if (!s) return null; return s.update(data); },
  deleteStudent: async (id, user) => { const s = await module.exports.getStudent(id, user); if (!s) return 0; await s.destroy(); return 1; },
};
