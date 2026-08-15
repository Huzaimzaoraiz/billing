import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDollarSign, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { enrollmentSchema, paymentSchema } from '../schemas';
import { currency, clean } from '../utils';
import { paymentMethods } from '../config';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export default function Billing() {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  
  const students = useQuery({ queryKey: ['students', 'billing'], queryFn: () => api.students() });
  
  const selectedStudent = useMemo(
    () => (students.data || []).find((student) => student.id === selectedStudentId),
    [selectedStudentId, students.data],
  );
  
  const courses = useQuery({
    queryKey: ['courses', 'billing', selectedStudent?.branch_id],
    queryFn: () => api.courses(selectedStudent?.branch_id),
    enabled: Boolean(selectedStudent),
  });
  
  const accounts = useQuery({
    queryKey: ['accounts', selectedStudentId],
    queryFn: () => api.accounts(selectedStudentId),
    enabled: Boolean(selectedStudentId),
  });

  const enrollmentForm = useForm({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { student_id: '', course_id: '', one_time_fee: 0, tuition_fee: 0, discount: 0 },
  });
  
  const paymentForm = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { fee_plan_id: '', amount: 0, payment_method: 'CASH', transaction_reference: '', remarks: '' },
  });

  const createEnrollment = useMutation({
    mutationFn: api.createEnrollment,
    onSuccess: () => {
      enrollmentForm.reset({ student_id: selectedStudentId, course_id: '', one_time_fee: 0, tuition_fee: 0, discount: 0 });
      queryClient.invalidateQueries({ queryKey: ['accounts', selectedStudentId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const receivePayment = useMutation({
    mutationFn: api.receivePayment,
    onSuccess: (data) => {
      paymentForm.reset({ fee_plan_id: '', amount: 0, payment_method: 'CASH', transaction_reference: '', remarks: '' });
      setPaymentReceipt(data.transaction_id);
      queryClient.invalidateQueries({ queryKey: ['accounts', selectedStudentId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setTimeout(() => setPaymentReceipt(null), 5000);
    },
  });

  useEffect(() => {
    enrollmentForm.setValue('student_id', selectedStudentId);
  }, [selectedStudentId, enrollmentForm]);

  useEffect(() => {
    if (courses.data && enrollmentForm.watch('course_id')) {
      const course = courses.data.find((c) => c.id === enrollmentForm.watch('course_id'));
      if (course) {
        enrollmentForm.setValue('one_time_fee', Number(course.default_admission_fee));
        enrollmentForm.setValue('tuition_fee', Number(course.default_tuition_fee));
      }
    }
  }, [enrollmentForm.watch('course_id'), courses.data, enrollmentForm]);

  const activePlans = (accounts.data?.FeePlan || []).filter(plan => plan.status === 'ACTIVE');

  return (
    <section className="view">
      <ViewHeader title="Billing & Accounts" subtitle="Manage student enrollments and fee collection." />
      
      <section className="panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(to right, var(--bg-surface), #f8fafc)' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
            Select Student Account
          </label>
          <select 
            value={selectedStudentId} 
            onChange={(e) => setSelectedStudentId(e.target.value)}
            style={{ width: '100%', maxWidth: '480px', fontSize: '16px', fontWeight: 500, padding: '12px 16px', height: 'auto', boxShadow: 'var(--shadow-sm)' }}
          >
            <option value="">Search or select a student...</option>
            {(students.data || []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} {student.phone ? `(${student.phone})` : ''} - {student.Branch?.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {!selectedStudentId ? (
        <div className="screen-message" style={{ height: '300px', border: '2px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.5)' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircleDollarSign size={48} style={{ color: 'var(--color-cyan)', opacity: 0.5, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Student Selected</h3>
            <p style={{ margin: 0 }}>Please select a student from the dropdown above to view accounts and process payments.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Action Forms (Side by side) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <section className="panel">
              <PanelTitle icon={Plus} title="New Enrollment" />
              <div className="notice" style={{ backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', marginBottom: '16px' }}>
                <AlertCircle size={16} />
                Note: A student can only have one active fee plan per course.
              </div>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={enrollmentForm.handleSubmit((values) => createEnrollment.mutate(clean(values)))}>
                <Field label="Course" error={enrollmentForm.formState.errors.course_id?.message}>
                  <select {...enrollmentForm.register('course_id')}>
                    <option value="">Choose course</option>
                    {(courses.data || []).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                  </select>
                </Field>
                <div className="responsive-grid-2">
                  <Field label="Admission Fee (One-time)"><input type="number" min="0" {...enrollmentForm.register('one_time_fee')} /></Field>
                  <Field label="Tuition Fee"><input type="number" min="0" {...enrollmentForm.register('tuition_fee')} /></Field>
                </div>
                <Field label="Total Discount"><input type="number" min="0" {...enrollmentForm.register('discount')} /></Field>
                <div className="form-actions" style={{ marginTop: '8px' }}>
                  <button className="primary-button" type="submit" style={{ width: '100%' }} disabled={createEnrollment.isPending || !enrollmentForm.watch('course_id')}>Create Enrollment</button>
                </div>
              </form>
              {createEnrollment.error && <div className="notice error form-notice">{createEnrollment.error.message}</div>}
            </section>

            <section className="panel">
              <PanelTitle icon={CircleDollarSign} title="Receive Payment" />
              {activePlans.length === 0 ? (
                <div className="empty-state" style={{ border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <AlertCircle size={24} style={{ color: 'var(--text-muted)' }} />
                  <span>No active fee plans. Enroll student first.</span>
                </div>
              ) : (
                <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={paymentForm.handleSubmit((values) => receivePayment.mutate(clean(values)))}>
                  <Field label="Fee Plan" error={paymentForm.formState.errors.fee_plan_id?.message}>
                    <select {...paymentForm.register('fee_plan_id')}>
                      <option value="">Select fee plan</option>
                      {activePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.Course.name} - Bal: {currency.format(plan.balance)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="responsive-grid-2">
                    <Field label="Amount" error={paymentForm.formState.errors.amount?.message}><input type="number" min="1" {...paymentForm.register('amount')} /></Field>
                    <Field label="Payment Method">
                      <select {...paymentForm.register('payment_method')}>
                        {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="responsive-grid-2">
                    <Field label="Transaction Ref (Optional)"><input {...paymentForm.register('transaction_reference')} placeholder="Cheque no, UPI ref..." /></Field>
                    <Field label="Remarks (Optional)"><input {...paymentForm.register('remarks')} /></Field>
                  </div>
                  
                  <div className="form-actions" style={{ marginTop: '8px' }}>
                    <button className="primary-button" type="submit" style={{ width: '100%' }} disabled={receivePayment.isPending}>Submit Payment</button>
                  </div>
                  
                  {paymentReceipt && (
                    <div className="notice success" style={{ marginTop: '16px' }}>
                      <CheckCircle2 size={16} />
                      Payment successful! Receipt ID: <strong>{paymentReceipt}</strong>
                    </div>
                  )}
                </form>
              )}
            </section>
          </div>

          {/* Data Tables (Stacked, Full Width) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="panel table-panel" style={{ padding: '0' }}>
              <div className="panel-heading" style={{ padding: '20px 24px 0 24px', margin: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Active Fee Plans</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <DataTable
                  columns={['Course', 'Admission Fee', 'Tuition Fee', 'Discount', 'Total Due', 'Balance', 'Status']}
                  rows={(accounts.data?.FeePlan || []).map((plan) => [
                    plan.Course.name,
                    currency.format(plan.one_time_fee),
                    currency.format(plan.tuition_fee),
                    currency.format(plan.discount),
                    <strong key="total">{currency.format(plan.total_due)}</strong>,
                    <span key="balance" style={{ color: plan.balance > 0 ? 'var(--color-red)' : 'inherit', fontWeight: 600 }}>{currency.format(plan.balance)}</span>,
                    <StatusBadge key={plan.id} active={plan.status === 'ACTIVE'} />
                  ])}
                />
              </div>
            </section>

            <section className="panel table-panel" style={{ padding: '0' }}>
              <div className="panel-heading" style={{ padding: '20px 24px 0 24px', margin: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Transactions</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <DataTable
                  columns={['Date', 'Type', 'Amount', 'Method', 'Course']}
                  rows={(accounts.data?.Transaction || []).map((txn) => [
                    new Date(txn.created_at).toLocaleDateString(),
                    txn.type === 'PAYMENT' ? <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> PAYMENT</span> : 'CHARGE',
                    <strong key="amount">{currency.format(txn.amount)}</strong>,
                    txn.payment_method || '-',
                    txn.FeePlan?.Course?.name || '-'
                  ])}
                />
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
