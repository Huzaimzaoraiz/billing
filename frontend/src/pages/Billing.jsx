import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleDollarSign, Plus, CheckCircle2 } from 'lucide-react';
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
      
      <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>Select Student</label>
        <select 
          value={selectedStudentId} 
          onChange={(e) => setSelectedStudentId(e.target.value)}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          <option value="">Search or select a student...</option>
          {(students.data || []).map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} {student.phone ? `(${student.phone})` : ''} - {student.Branch?.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedStudentId ? (
        <div className="screen-message" style={{ height: '300px' }}>
          Select a student to view accounts and process payments.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="billing-column">
            <section className="panel">
              <PanelTitle icon={Plus} title="New Enrollment" />
              <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={enrollmentForm.handleSubmit((values) => createEnrollment.mutate(clean(values)))}>
                <Field label="Course" error={enrollmentForm.formState.errors.course_id?.message}>
                  <select {...enrollmentForm.register('course_id')}>
                    <option value="">Choose course</option>
                    {(courses.data || []).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                  </select>
                </Field>
                <Field label="Admission Fee (One-time)"><input type="number" min="0" {...enrollmentForm.register('one_time_fee')} /></Field>
                <Field label="Tuition Fee (Monthly)"><input type="number" min="0" {...enrollmentForm.register('tuition_fee')} /></Field>
                <Field label="Total Discount"><input type="number" min="0" {...enrollmentForm.register('discount')} /></Field>
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={createEnrollment.isPending || !enrollmentForm.watch('course_id')}>Create Enrollment</button>
                </div>
              </form>
            </section>

            <section className="panel">
              <PanelTitle icon={CircleDollarSign} title="Receive Payment" />
              {activePlans.length === 0 ? (
                <div className="empty-state">No active fee plans. Enroll student first.</div>
              ) : (
                <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={paymentForm.handleSubmit((values) => receivePayment.mutate(clean(values)))}>
                  <Field label="Fee Plan" error={paymentForm.formState.errors.fee_plan_id?.message}>
                    <select {...paymentForm.register('fee_plan_id')}>
                      <option value="">Select fee plan</option>
                      {activePlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.Course.name} - Bal: {currency.format(plan.balance)} (Monthly: {currency.format(plan.tuition_fee)})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount" error={paymentForm.formState.errors.amount?.message}><input type="number" min="1" {...paymentForm.register('amount')} /></Field>
                  <Field label="Payment Method">
                    <select {...paymentForm.register('payment_method')}>
                      {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Transaction Ref (Optional)"><input {...paymentForm.register('transaction_reference')} placeholder="Cheque no, UPI ref..." /></Field>
                  <Field label="Remarks (Optional)"><input {...paymentForm.register('remarks')} /></Field>
                  
                  <div className="form-actions">
                    <button className="primary-button" type="submit" disabled={receivePayment.isPending}>Submit Payment</button>
                  </div>
                  
                  {paymentReceipt && (
                    <div className="notice" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#22c55e" />
                      Payment successful! Receipt ID: <strong>{paymentReceipt}</strong>
                    </div>
                  )}
                </form>
              )}
            </section>
          </div>

          <div className="billing-column">
            <section className="panel">
              <h3>Active Fee Plans</h3>
              <DataTable
                columns={['Course', 'Monthly Fee', 'Total Due', 'Balance', 'Status']}
                rows={(accounts.data?.FeePlan || []).map((plan) => [
                  plan.Course.name,
                  currency.format(plan.tuition_fee),
                  currency.format(plan.total_due),
                  currency.format(plan.balance),
                  <StatusBadge key={plan.id} active={plan.status === 'ACTIVE'} />
                ])}
              />
            </section>

            <section className="panel">
              <h3>Recent Transactions</h3>
              <DataTable
                columns={['Date', 'Type', 'Amount', 'Method', 'Course']}
                rows={(accounts.data?.Transaction || []).map((txn) => [
                  new Date(txn.created_at).toLocaleDateString(),
                  txn.type === 'PAYMENT' ? <span style={{ color: '#22c55e' }}>PAYMENT</span> : 'CHARGE',
                  currency.format(txn.amount),
                  txn.payment_method || '-',
                  txn.FeePlan?.Course?.name || '-'
                ])}
              />
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
