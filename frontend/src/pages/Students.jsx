import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PiPlusBold as Plus } from 'react-icons/pi';
import { api } from '../api/client';
import { studentSchema } from '../schemas';
import { clean } from '../utils';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';

export default function Students({ user }) {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  
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

  const updateStudent = useMutation({
    mutationFn: (data) => api.updateStudent(editingStudentId, data),
    onSuccess: () => {
      form.reset();
      setEditingStudentId(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deactivateStudent = useMutation({
    mutationFn: api.deactivateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (editingStudentId && students.data) {
      const student = students.data.find(s => s.id === editingStudentId);
      if (student) {
        form.reset({
          branch_id: student.branch_id,
          name: student.name,
          father_name: student.father_name || '',
          phone: student.phone || '',
          parent_phone: student.parent_phone || '',
          joining_date: student.joining_date ? new Date(student.joining_date).toISOString().split('T')[0] : '',
        });
      }
    } else {
      form.reset({ branch_id: '', name: '', father_name: '', phone: '', parent_phone: '', joining_date: '' });
    }
  }, [editingStudentId, students.data, form]);

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
        <PanelTitle icon={Plus} title={editingStudentId ? "Edit student" : "Add student"} />
        <form className="form-grid" onSubmit={form.handleSubmit((values) => editingStudentId ? updateStudent.mutate(clean(values)) : createStudent.mutate(clean(values)))}>
          {isSuperAdmin && (
            <Field label="Branch">
              <select {...form.register('branch_id')} disabled={!!editingStudentId}>
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
          <div className="form-actions" style={{ gap: '8px' }}>
            {editingStudentId && (
              <button type="button" className="ghost-button" onClick={() => setEditingStudentId(null)}>Cancel</button>
            )}
            <button className="primary-button" type="submit" disabled={createStudent.isPending || updateStudent.isPending}>
              {editingStudentId ? 'Update student' : 'Save student'}
            </button>
          </div>
        </form>
      </section>
      <DataTable
        columns={['Name', 'Branch', 'Phone', 'Parent phone', 'Status', '']}
        rows={(students.data || []).map((student) => [
          student.name,
          student.Branch?.name || '-',
          student.phone || '-',
          student.parent_phone || '-',
          student.status,
          <div style={{ display: 'flex', gap: '8px' }} key={`${student.id}-actions`}>
            <button className="ghost-button" onClick={() => setEditingStudentId(student.id)}>Edit</button>
            {student.status === 'ACTIVE' && (
              <button className="ghost-button" onClick={() => deactivateStudent.mutate(student.id)}>Deactivate</button>
            )}
          </div>
        ])}
      />
    </section>
  );
}
