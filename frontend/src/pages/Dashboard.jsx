import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, BookOpen, Users, UserCheck, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { currency } from '../utils';
import Metric from '../components/Metric';
import ViewHeader from '../components/ViewHeader';
import DataTable from '../components/DataTable';

export default function Dashboard({ user }) {
  const [selectedBranch, setSelectedBranch] = useState('');
  
  const branchesQuery = useQuery({ queryKey: ['branches'], queryFn: api.branches, enabled: user?.role === 'SUPER_ADMIN' });
  const { data, isLoading } = useQuery({ 
    queryKey: ['dashboard', selectedBranch], 
    queryFn: () => api.dashboard(selectedBranch)
  });

  if (isLoading) return <div className="screen-message">Loading dashboard...</div>;
  if (!data) return null;

  const chartData = Object.entries(data.totals.income_by_month || {}).map(([month, amount]) => ({
    name: month,
    amount: Number(amount)
  })).slice(-6);

  return (
    <section className="view">
      <ViewHeader title="Dashboard" subtitle="Overview of your business metrics." />
      
      {user?.role === 'SUPER_ADMIN' && (
        <div className="toolbar">
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
            <option value="">All Branches (System Total)</option>
            {(branchesQuery.data || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <div className="metrics-grid">
        <Metric icon={Building2} label="Branches" value={data.totals.branches} />
        <Metric icon={BookOpen} label="Courses" value={data.totals.courses} />
        <Metric icon={Users} label="Total Students" value={data.totals.students} />
        <Metric icon={UserCheck} label="Active Students" value={data.totals.active_students} />
      </div>
      <div className="metrics-grid" style={{ marginTop: '16px' }}>
        <Metric icon={TrendingUp} label="Total Income" value={currency.format(data.totals.total_income)} />
        <Metric icon={TrendingDown} label="Total Expenses" value={currency.format(data.totals.total_expense)} />
        <Metric icon={Wallet} label="Net Profit" value={currency.format(data.totals.net_profit)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section className="panel">
          <h3>Income (Last 6 Months)</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <h3>Branch Performance</h3>
          <DataTable
            columns={['Branch', 'Students', 'Active', 'Month Income']}
            rows={data.branches.map(b => [
              b.name,
              b.total_students,
              b.active_students,
              currency.format(b.month_income),
            ])}
          />
        </section>
      </div>
    </section>
  );
}
