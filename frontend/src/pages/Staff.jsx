import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCog } from 'lucide-react';
import { api } from '../api/client';
import { userSchema } from '../schemas';
import { displayRole } from '../utils';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';

export default function Staff() {
  const queryClient = useQueryClient();
  const branches = useQuery({ queryKey: ['branches'], queryFn: api.branches });
  const users = useQuery({ queryKey: ['users'], queryFn: api.users });
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { branch_id: '', name: '', email: '', role: 'STAFF' },
  });
  const createUser = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      form.reset({ branch_id: '', name: '', email: '', role: 'STAFF' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return (
    <section className="view">
      <ViewHeader title="Staff" subtitle="Branch-specific users managed by super admin." />
      <section className="panel">
        <PanelTitle icon={UserCog} title="Add staff" />
        <form className="form-grid" onSubmit={form.handleSubmit((values) => createUser.mutate(values))}>
          <Field label="Branch" error={form.formState.errors.branch_id?.message}>
            <select {...form.register('branch_id')}>
              <option value="">Choose branch</option>
              {(branches.data || []).map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
            </select>
          </Field>
          <Field label="Role" error={form.formState.errors.role?.message}>
            <select {...form.register('role')} disabled>
              <option value="STAFF">Staff</option>
            </select>
          </Field>
          <Field label="Name" error={form.formState.errors.name?.message}><input {...form.register('name')} /></Field>
          <Field label="Email" error={form.formState.errors.email?.message}><input type="email" {...form.register('email')} /></Field>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={createUser.isPending}>Save staff</button>
          </div>
        </form>
        {createUser.error && <div className="notice error form-notice">{createUser.error.message}</div>}
      </section>
      <DataTable
        columns={['Name', 'Email', 'Role', 'Branch', 'Status']}
        rows={(users.data || []).map((user) => [
          user.name,
          user.email,
          displayRole(user.role),
          user.Branch ? `${user.Branch.code} · ${user.Branch.name}` : '-',
          <StatusBadge key={user.id} active={user.is_active} />,
        ])}
      />
    </section>
  );
}
