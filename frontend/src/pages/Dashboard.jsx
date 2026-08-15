import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PiBankBold as Building2, PiBooksBold as BookOpen, PiGraduationCapBold as Users, PiUserCircleCheckBold as UserCheck, PiTrendUpBold as TrendingUp, PiTrendDownBold as TrendingDown, PiWalletBold as Wallet } from 'react-icons/pi';
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

      <div className="metric-grid">
        {user?.role === 'SUPER_ADMIN' && !selectedBranch && (
          <Metric icon={Building2} label="Branches" value={data.totals.branches} />
        )}
        <Metric icon={BookOpen} label="Courses" value={data.totals.courses} />
        <Metric icon={Users} label="Total Students" value={data.totals.students} />
        <Metric icon={UserCheck} label="Active Students" value={data.totals.active_students} />
      </div>
      <div className="metric-grid" style={{ marginTop: '16px' }}>
        <Metric icon={TrendingUp} label="Total Income" value={currency.format(data.totals.total_income)} />
        <Metric icon={TrendingDown} label="Total Expenses" value={currency.format(data.totals.total_expense)} />
        <Metric icon={Wallet} label="Net Profit" value={currency.format(data.totals.net_profit)} />
      </div>

      <div className="responsive-grid-2">
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

        {user?.role === 'SUPER_ADMIN' && !selectedBranch && (
        <section className="panel">
          <h3>Branch Performance</h3>
          <DataTable
            columns={['Branch:', 'Students:', 'Active:', 'Month Income:', 'Month Expense:', 'Net Profit:']}
            rows={data.branches.map(b => [
              b.name,
              b.total_students,
              b.active_students,
              currency.format(b.month_income),
              currency.format(b.month_expense),
              currency.format(b.month_income - b.month_expense),
            ])}
          />
        </section>
        )}
      </div>
    </section>
  );
}
