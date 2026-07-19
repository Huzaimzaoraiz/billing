import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api } from './api/client';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const branchSchema = z.object({
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
});

const courseSchema = z.object({
  branch_id: z.string().uuid('Choose a branch'),
  code: z.string().min(2, 'Code is required'),
  name: z.string().min(2, 'Name is required'),
  duration_months: z.coerce.number().int().min(1),
  default_admission_fee: z.coerce.number().min(0),
  default_tuition_fee: z.coerce.number().min(0),
});

const studentSchema = z.object({
  branch_id: z.string().optional(),
  name: z.string().min(2, 'Name is required'),
  father_name: z.string().optional(),
  phone: z.string().optional(),
  parent_phone: z.string().optional(),
  joining_date: z.string().optional(),
});

const enrollmentSchema = z.object({
  student_id: z.string().uuid('Choose a student'),
  course_id: z.string().uuid('Choose a course'),
  one_time_fee: z.coerce.number().min(0),
  tuition_fee: z.coerce.number().min(0),
  discount: z.coerce.number().min(0),
  installment_count: z.coerce.number().int().min(1).max(36),
  first_due_date: z.string().optional(),
});

const paymentSchema = z.object({
  installment_id: z.string().uuid('Choose an installment'),
  amount: z.coerce.number().positive('Amount is required'),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'CHEQUE', 'OTHER']),
  transaction_reference: z.string().optional(),
  remarks: z.string().optional(),
});

function App() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState('dashboard');
  const session = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });

  if (session.isLoading) return <div className="screen-message">Opening workspace...</div>;
  if (!session.data) return <LoginScreen onLogin={(user) => queryClient.setQueryData(['me'], user)} />;

  return (
    <Shell user={session.data} activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'dashboard' && <Dashboard />}
      {activeView === 'branches' && <Branches user={session.data} />}
      {activeView === 'courses' && <Courses user={session.data} />}
      {activeView === 'students' && <Students user={session.data} />}
      {activeView === 'billing' && <Billing />}
    </Shell>
  );
}

function LoginScreen({ onLogin }) {
  const form = useForm({ resolver: zodResolver(z.object({ username: z.string().min(1), password: z.string().min(1) })) });
  const login = useMutation({ mutationFn: api.login, onSuccess: onLogin });

  return (
    <main className="login-layout">
      <section className="login-panel">
        <div className="brand-mark">
          <School size={28} />
        </div>
        <h1>Institute Billing</h1>
        <p>Sign in to manage branches, students, courses, and fee operations.</p>
        <form onSubmit={form.handleSubmit((values) => login.mutate(values))} className="form-stack">
          <label>
            Email or name
            <input autoComplete="username" {...form.register('username')} />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" {...form.register('password')} />
          </label>
          {login.error && <div className="notice error">{login.error.message}</div>}
          <button className="primary-button" type="submit" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({ user, activeView, onViewChange, children }) {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => queryClient.clear(),
  });
  const navItems = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['branches', Building2, 'Branches'],
    ['courses', BookOpen, 'Courses'],
    ['students', Users, 'Students'],
    ['billing', ReceiptText, 'Billing'],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <School size={24} />
          <span>Institute Billing</span>
        </div>
        <nav>
          {navItems.map(([key, Icon, label]) => (
            <button key={key} className={clsx('nav-button', activeView === key && 'active')} onClick={() => onViewChange(key)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <span>{user.role.replaceAll('_', ' ')}</span>
          </div>
          <button className="icon-text-button" onClick={() => logout.mutate()}>
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
  const totals = dashboard.data?.totals || {};
  const branches = dashboard.data?.branches || [];

  return (
    <section className="view">
      <ViewHeader title="Dashboard" subtitle="Financial and operational health by branch." />
      <div className="metric-grid">
        <Metric icon={Building2} label="Branches" value={totals.branches || 0} />
        <Metric icon={BookOpen} label="Courses" value={totals.courses || 0} />
        <Metric icon={Users} label="Students" value={totals.students || 0} />
        <Metric icon={CircleDollarSign} label="Collected" value={currency.format(totals.total_income || 0)} />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Branch activity</h2>
          <span>{branches.length} branches</span>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={branches}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip formatter={(value, name) => (name === 'total_income' ? currency.format(value) : value)} />
              <Bar dataKey="active_students" name="Active students" fill="#2f6f73" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_income" name="Income" fill="#c78126" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </section>
  );
}

function Branches({ user }) {
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches'], queryFn: api.branches });
  const form = useForm({ resolver: zodResolver(branchSchema), defaultValues: { code: '', name: '', city: '', address: '', phone: '', email: '' } });
  const createBranch = useMutation({
    mutationFn: api.createBranch,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <section className="view">
      <ViewHeader title="Branches" subtitle="Company-owned centers and operating locations." />
      {isSuperAdmin && (
        <section className="panel">
          <PanelTitle icon={Plus} title="Create branch" />
          <form className="form-grid" onSubmit={form.handleSubmit((values) => createBranch.mutate(clean(values)))}>
            <Field label="Code" error={form.formState.errors.code?.message}><input {...form.register('code')} /></Field>
            <Field label="Name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
            <Field label="City"><input {...form.register('city')} /></Field>
            <Field label="Phone"><input {...form.register('phone')} /></Field>
            <Field label="Email" error={form.formState.errors.email?.message}><input {...form.register('email')} /></Field>
            <Field label="Address"><input {...form.register('address')} /></Field>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={createBranch.isPending}>Save branch</button>
            </div>
          </form>
        </section>
      )}
      <DataTable
        columns={['Code', 'Name', 'City', 'Phone', 'Status']}
        rows={(branches.data || []).map((branch) => [
          branch.code,
          branch.name,
          branch.city || '-',
          branch.phone || '-',
          <StatusBadge key={branch.id} active={branch.is_active} />,
        ])}
      />
    </section>
  );
}

function Courses({ user }) {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('');
  const branches = useQuery({ queryKey: ['branches'], queryFn: api.branches });
  const courses = useQuery({ queryKey: ['courses', branchFilter], queryFn: () => api.courses(branchFilter) });
  const form = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: { branch_id: '', code: '', name: '', duration_months: 1, default_admission_fee: 0, default_tuition_fee: 0 },
  });
  const createCourse = useMutation({
    mutationFn: api.createCourse,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const disableCourse = useMutation({
    mutationFn: api.disableCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <section className="view">
      <ViewHeader title="Courses" subtitle="Central catalog controlled by super admin." />
      <div className="toolbar">
        {isSuperAdmin && (
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        )}
        <span className="permission-note"><ShieldCheck size={16} /> Only super admin can create or change courses.</span>
      </div>
      {isSuperAdmin && (
        <section className="panel">
          <PanelTitle icon={Plus} title="Create course" />
          <form className="form-grid" onSubmit={form.handleSubmit((values) => createCourse.mutate(values))}>
            <Field label="Branch" error={form.formState.errors.branch_id?.message}>
              <select {...form.register('branch_id')}>
                <option value="">Choose branch</option>
                {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </Field>
            <Field label="Code" error={form.formState.errors.code?.message}><input {...form.register('code')} /></Field>
            <Field label="Course name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
            <Field label="Duration months"><input type="number" min="1" {...form.register('duration_months')} /></Field>
            <Field label="Admission fee"><input type="number" min="0" {...form.register('default_admission_fee')} /></Field>
            <Field label="Tuition fee"><input type="number" min="0" {...form.register('default_tuition_fee')} /></Field>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={createCourse.isPending}>Save course</button>
            </div>
          </form>
        </section>
      )}
      <DataTable
        columns={['Code', 'Course', 'Branch', 'Duration', 'Default fee', 'Status', '']}
        rows={(courses.data || []).map((course) => [
          course.code,
          course.name,
          course.Branch?.name || '-',
          `${course.duration_months} mo`,
          currency.format(Number(course.default_admission_fee || 0) + Number(course.default_tuition_fee || 0)),
          <StatusBadge key={`${course.id}-status`} active={course.is_active} />,
          isSuperAdmin ? <button key={course.id} className="ghost-button" onClick={() => disableCourse.mutate(course.id)}>Disable</button> : null,
        ])}
      />
    </section>
  );
}

function Students({ user }) {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('');
  const branches = useQuery({ queryKey: ['branches'], queryFn: api.branches });
  const students = useQuery({ queryKey: ['students', branchFilter], queryFn: () => api.students(branchFilter) });
  const form = useForm({ resolver: zodResolver(studentSchema), defaultValues: { branch_id: '', name: '', father_name: '', phone: '', parent_phone: '', joining_date: '' } });
  const createStudent = useMutation({
    mutationFn: api.createStudent,
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <section className="view">
      <ViewHeader title="Students" subtitle="Branch-scoped student records for billing and follow-up." />
      {isSuperAdmin && (
        <div className="toolbar">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </div>
      )}
      <section className="panel">
        <PanelTitle icon={Plus} title="Add student" />
        <form className="form-grid" onSubmit={form.handleSubmit((values) => createStudent.mutate(clean(values)))}>
          {isSuperAdmin && (
            <Field label="Branch">
              <select {...form.register('branch_id')}>
                <option value="">Choose branch</option>
                {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Student name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
          <Field label="Father name"><input {...form.register('father_name')} /></Field>
          <Field label="Student phone"><input {...form.register('phone')} /></Field>
          <Field label="Parent phone"><input {...form.register('parent_phone')} /></Field>
          <Field label="Joining date"><input type="date" {...form.register('joining_date')} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={createStudent.isPending}>Save student</button>
          </div>
        </form>
      </section>
      <DataTable
        columns={['Name', 'Branch', 'Phone', 'Parent phone', 'Status']}
        rows={(students.data || []).map((student) => [
          student.name,
          student.Branch?.name || '-',
          student.phone || '-',
          student.parent_phone || '-',
          student.status,
        ])}
      />
    </section>
  );
}

function Billing() {
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: ['students', 'billing'], queryFn: () => api.students() });
  const courses = useQuery({ queryKey: ['courses', 'billing'], queryFn: () => api.courses() });
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.accounts() });
  const enrollmentForm = useForm({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { student_id: '', course_id: '', one_time_fee: 0, tuition_fee: 0, discount: 0, installment_count: 1, first_due_date: '' },
  });
  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { installment_id: '', amount: '', payment_method: 'CASH', transaction_reference: '', remarks: '' },
  });
  const createEnrollment = useMutation({
    mutationFn: api.createEnrollment,
    onSuccess: () => {
      enrollmentForm.reset();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const receivePayment = useMutation({
    mutationFn: api.receivePayment,
    onSuccess: () => {
      paymentForm.reset();
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const installments = (accounts.data || []).flatMap((account) => {
    const feePlan = account.FeePlan;
    return (feePlan?.Installments || [])
      .filter((installment) => installment.status !== 'PAID' && installment.status !== 'CANCELLED')
      .map((installment) => ({
        ...installment,
        label: `${account.Student?.name || 'Student'} · ${account.Course?.code || 'Course'} · ${installment.title}`,
        remaining: Number(installment.amount_due || 0) - Number(installment.amount_paid || 0),
      }));
  });

  return (
    <section className="view">
      <ViewHeader title="Billing" subtitle="Enroll students, generate installments, and receive payments." />
      <section className="panel">
        <PanelTitle icon={Plus} title="Create fee plan" />
        <form className="form-grid" onSubmit={enrollmentForm.handleSubmit((values) => createEnrollment.mutate(clean(values)))}>
          <Field label="Student" error={enrollmentForm.formState.errors.student_id?.message}>
            <select {...enrollmentForm.register('student_id')}>
              <option value="">Choose student</option>
              {(students.data || []).map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </Field>
          <Field label="Course" error={enrollmentForm.formState.errors.course_id?.message}>
            <select {...enrollmentForm.register('course_id')}>
              <option value="">Choose course</option>
              {(courses.data || []).map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}
            </select>
          </Field>
          <Field label="Installments"><input type="number" min="1" max="36" {...enrollmentForm.register('installment_count')} /></Field>
          <Field label="Admission fee"><input type="number" min="0" {...enrollmentForm.register('one_time_fee')} /></Field>
          <Field label="Tuition fee"><input type="number" min="0" {...enrollmentForm.register('tuition_fee')} /></Field>
          <Field label="Discount"><input type="number" min="0" {...enrollmentForm.register('discount')} /></Field>
          <Field label="First due date"><input type="date" {...enrollmentForm.register('first_due_date')} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={createEnrollment.isPending}>Generate plan</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <PanelTitle icon={CircleDollarSign} title="Receive payment" />
        <form className="form-grid" onSubmit={paymentForm.handleSubmit((values) => receivePayment.mutate(clean(values)))}>
          <Field label="Installment" error={paymentForm.formState.errors.installment_id?.message}>
            <select {...paymentForm.register('installment_id')}>
              <option value="">Choose installment</option>
              {installments.map((installment) => (
                <option key={installment.id} value={installment.id}>{installment.label} · {currency.format(installment.remaining)} due</option>
              ))}
            </select>
          </Field>
          <Field label="Amount" error={paymentForm.formState.errors.amount?.message}><input type="number" min="1" {...paymentForm.register('amount')} /></Field>
          <Field label="Method">
            <select {...paymentForm.register('payment_method')}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Reference"><input {...paymentForm.register('transaction_reference')} /></Field>
          <Field label="Remarks"><input {...paymentForm.register('remarks')} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={receivePayment.isPending}>Receive payment</button>
          </div>
        </form>
      </section>
      <DataTable
        columns={['Student', 'Course', 'Final fee', 'Paid', 'Open installments']}
        rows={(accounts.data || []).map((account) => {
          const feePlan = account.FeePlan;
          const installmentsForAccount = feePlan?.Installments || [];
          const paid = installmentsForAccount.reduce((sum, installment) => sum + Number(installment.amount_paid || 0), 0);
          const open = installmentsForAccount.filter((installment) => installment.status !== 'PAID').length;
          return [
            account.Student?.name || '-',
            account.Course?.name || '-',
            currency.format(Number(feePlan?.final_fee || 0)),
            currency.format(paid),
            open,
          ];
        })}
      />
    </section>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ViewHeader({ title, subtitle }) {
  return (
    <div className="view-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="panel-heading">
      <h2><Icon size={18} /> {title}</h2>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={clsx('status-badge', active ? 'good' : 'muted')}>
      {active ? <CheckCircle2 size={14} /> : null}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function DataTable({ columns, rows }) {
  return (
    <section className="table-panel">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length} className="empty-state">No records yet.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function clean(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== undefined));
}

export default App;
