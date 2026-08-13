import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { currency } from '../utils';
import ViewHeader from '../components/ViewHeader';
import PanelTitle from '../components/PanelTitle';
import Field from '../components/Field';
import DataTable from '../components/DataTable';

export default function Expenses({ user }) {
  const queryClient = useQueryClient();
  const [selectedBranch, setSelectedBranch] = useState(user.role === 'SUPER_ADMIN' ? '' : user.branch_id);
  
  const branches = useQuery({ queryKey: ['branches'], queryFn: api.branches, enabled: user.role === 'SUPER_ADMIN' });
  const expenses = useQuery({ 
    queryKey: ['expenses', selectedBranch], 
    queryFn: () => api.expenses(selectedBranch),
    enabled: user.role === 'SUPER_ADMIN' ? !!selectedBranch : true
  });

  const form = useForm({
    defaultValues: { amount: '', category: 'Rent', description: '', expense_date: new Date().toISOString().split('T')[0] }
  });

  const createExpense = useMutation({
    mutationFn: (data) => api.createExpense({ ...data, branch_id: selectedBranch, amount: Number(data.amount) }),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteExpense = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  return (
    <section className="view">
      <ViewHeader title="Expenses" subtitle="Track daily and monthly branch expenses." />

      {user.role === 'SUPER_ADMIN' && (
        <div className="toolbar">
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">Select a branch to view/add expenses</option>
            {(branches.data || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      {selectedBranch && (
        <>
          <section className="panel">
            <PanelTitle icon={Plus} title="Record Expense" />
            <form className="form-grid" onSubmit={form.handleSubmit((v) => createExpense.mutate(v))}>
              <Field label="Amount">
                <input type="number" step="0.01" min="0" required {...form.register('amount')} />
              </Field>
              <Field label="Category">
                <select required {...form.register('category')}>
                  <option value="Rent">Rent</option>
                  <option value="Salary">Salary</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Date">
                <input type="date" required {...form.register('expense_date')} />
              </Field>
              <Field label="Description">
                <input type="text" {...form.register('description')} placeholder="Optional notes" />
              </Field>
              <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                <button className="primary-button" type="submit" disabled={createExpense.isPending}>
                  {createExpense.isPending ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h3>Recent Expenses</h3>
            <DataTable
              columns={['Date', 'Category', 'Description', 'Amount', 'Logged By', '']}
              rows={(expenses.data || []).map((expense) => [
                new Date(expense.expense_date).toLocaleDateString(),
                expense.category,
                expense.description || '-',
                currency.format(expense.amount),
                expense.Creator?.name || 'Unknown',
                <button key={`del-${expense.id}`} className="ghost-button" onClick={() => {
                  if (confirm('Are you sure you want to delete this expense?')) deleteExpense.mutate(expense.id);
                }}>
                  <Trash2 size={16} color="var(--color-red)" />
                </button>
              ])}
            />
          </section>
        </>
      )}
    </section>
  );
}
