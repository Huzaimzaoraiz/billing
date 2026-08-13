import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { courseSchema } from '../schemas';
import { currency } from '../utils';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export default function Courses({ user }) {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('');
  const [editingCourseId, setEditingCourseId] = useState(null);
  
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

  const updateCourse = useMutation({
    mutationFn: (data) => api.updateCourse(editingCourseId, data),
    onSuccess: () => {
      form.reset();
      setEditingCourseId(null);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const disableCourse = useMutation({
    mutationFn: api.disableCourse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });
  
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (editingCourseId && courses.data) {
      const course = courses.data.find(c => c.id === editingCourseId);
      if (course) {
        form.reset({
          branch_id: course.branch_id,
          code: course.code,
          name: course.name,
          duration_months: course.duration_months,
          default_admission_fee: Number(course.default_admission_fee),
          default_tuition_fee: Number(course.default_tuition_fee),
        });
      }
    } else {
      form.reset({ branch_id: '', code: '', name: '', duration_months: 1, default_admission_fee: 0, default_tuition_fee: 0 });
    }
  }, [editingCourseId, courses.data, form]);

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
          <PanelTitle icon={Plus} title={editingCourseId ? "Edit course" : "Create course"} />
          <form className="form-grid" onSubmit={form.handleSubmit((values) => editingCourseId ? updateCourse.mutate(values) : createCourse.mutate(values))}>
            <Field label="Branch" error={form.formState.errors.branch_id?.message}>
              <select {...form.register('branch_id')} disabled={!!editingCourseId}>
                <option value="">Choose branch</option>
                {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </Field>
            <Field label="Code" error={form.formState.errors.code?.message}><input {...form.register('code')} /></Field>
            <Field label="Course name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
            <Field label="Duration months"><input type="number" min="1" {...form.register('duration_months')} /></Field>
            <Field label="Admission fee"><input type="number" min="0" {...form.register('default_admission_fee')} /></Field>
            <Field label="Tuition fee"><input type="number" min="0" {...form.register('default_tuition_fee')} /></Field>
            <div className="form-actions" style={{ gap: '8px' }}>
              {editingCourseId && (
                <button type="button" className="ghost-button" onClick={() => setEditingCourseId(null)}>Cancel</button>
              )}
              <button className="primary-button" type="submit" disabled={createCourse.isPending || updateCourse.isPending}>
                {editingCourseId ? 'Update course' : 'Save course'}
              </button>
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
          isSuperAdmin ? (
            <div style={{ display: 'flex', gap: '8px' }} key={`${course.id}-actions`}>
              <button className="ghost-button" onClick={() => setEditingCourseId(course.id)}>Edit</button>
              <button className="ghost-button" onClick={() => disableCourse.mutate(course.id)}>Disable</button>
            </div>
          ) : null,
        ])}
      />
    </section>
  );
}
