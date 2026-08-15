import { useClerk } from '@clerk/clerk-react';
import { PiSignOutBold as LogOut, PiCompassBold as LayoutDashboard, PiBankBold as Building2, PiBooksBold as BookOpen, PiPenNibBold as UserCog, PiGraduationCapBold as Users, PiScalesBold as ReceiptText, PiFileTextBold, PiUserCircleCheckBold as UserRoundCheck, PiCalculatorBold as Receipt } from 'react-icons/pi';
import clsx from 'clsx';
import { appConfig } from '../config';

export default function Shell({ user, activeView, onViewChange, children }) {
  const { signOut } = useClerk();
  const navItems = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['branches', Building2, 'Branches'],
    ['courses', BookOpen, 'Courses'],
    ...(user.role === 'SUPER_ADMIN' ? [['staff', UserCog, 'Staff']] : []),
    ['students', Users, 'Students'],
    ['billing', ReceiptText, 'Billing'],
    ['expenses', Receipt, 'Expenses'],
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <PiFileTextBold size={28} style={{ color: '#991b1b' }} />
          <span>{appConfig.name}</span>
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
            {user.role !== 'SUPER_ADMIN' && <span className="branch-tag">{user.branch_id}</span>}
          </div>
          <div className="user-menu">
            <span className="user-name"><UserRoundCheck size={16} /> {user.name}</span>
            <button className="ghost-button" onClick={() => signOut()}><LogOut size={16} /> Sign out</button>
          </div>
        </header>
        <div className="workspace-content">
          {children}
        </div>
      </main>
    </div>
  );
}
