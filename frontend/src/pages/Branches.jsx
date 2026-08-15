import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PiPlusBold as Plus } from 'react-icons/pi';
import { api } from '../api/client';
import { branchSchema } from '../schemas';
import { clean } from '../utils';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export default function Branches({ user }) {
  const queryClient = useQueryClient();
  const [editingBranchId, setEditingBranchId] = useState(null);
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

  const updateBranch = useMutation({
    mutationFn: (data) => api.updateBranch(editingBranchId, data),
    onSuccess: () => {
      form.reset();
      setEditingBranchId(null);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (editingBranchId && branches.data) {
      const branch = branches.data.find(b => b.id === editingBranchId);
      if (branch) {
        form.reset({
          code: branch.code,
          name: branch.name,
          city: branch.city || '',
          address: branch.address || '',
          phone: branch.phone || '',
          email: branch.email || '',
        });
      }
    } else {
      form.reset({ code: '', name: '', city: '', address: '', phone: '', email: '' });
    }
  }, [editingBranchId, branches.data, form]);

  return (
    <section className="view">
      <ViewHeader title="Branches" subtitle="Company-owned centers and operating locations." />
      {isSuperAdmin && (
        <section className="panel">
          <PanelTitle icon={Plus} title={editingBranchId ? "Edit branch" : "Create branch"} />
          <form className="form-grid" onSubmit={form.handleSubmit((values) => editingBranchId ? updateBranch.mutate(clean(values)) : createBranch.mutate(clean(values)))}>
            <Field label="Code" error={form.formState.errors.code?.message}><input {...form.register('code')} /></Field>
            <Field label="Name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
            <Field label="City"><input {...form.register('city')} /></Field>
            <Field label="Phone"><input {...form.register('phone')} /></Field>
            <Field label="Email" error={form.formState.errors.email?.message}><input {...form.register('email')} /></Field>
            <Field label="Address"><input {...form.register('address')} /></Field>
            <div className="form-actions" style={{ gap: '8px' }}>
              {editingBranchId && (
                <button type="button" className="ghost-button" onClick={() => setEditingBranchId(null)}>Cancel</button>
              )}
              <button className="primary-button" type="submit" disabled={createBranch.isPending || updateBranch.isPending}>
                {editingBranchId ? 'Update branch' : 'Save branch'}
              </button>
            </div>
          </form>
        </section>
      )}
      <DataTable
        columns={['Code', 'Name', 'City', 'Phone', 'Status', '']}
        rows={(branches.data || []).map((branch) => [
          branch.code,
          branch.name,
          branch.city || '-',
          branch.phone || '-',
          <StatusBadge key={`${branch.id}-status`} active={branch.is_active} />,
          isSuperAdmin ? (
            <button key={`${branch.id}-actions`} className="ghost-button" onClick={() => setEditingBranchId(branch.id)}>Edit</button>
          ) : null,
        ])}
      />
    </section>
  );
}
