import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useUser, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { PiFileTextBold as School, PiShieldCheckBold as ShieldCheck } from 'react-icons/pi';
import { api, setTokenProvider } from './api/client';
import { appConfig } from './config';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Staff from './pages/Staff';
import Courses from './pages/Courses';
import Students from './pages/Students';
import Billing from './pages/Billing';
import Expenses from './pages/Expenses';


export default function App() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);

  return (
    <>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
      <SignedOut>
        <main className="login-layout">
          <div className="login-brand-panel">
            <div className="login-brand-content">
              <h1 className="brand-title">{appConfig.name}</h1>
              <div className="brand-subtitle" style={{
                marginTop: '24px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '13px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.8'
              }}>
                Enterprise Management System<br />
                For Coaching Institutes
              </div>
            </div>

            <div className="login-brand-footer" style={{
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
              System Operational
            </div>
          </div>
          <section className="login-auth-panel">
            <div className="auth-container">
              <SignIn
                appearance={{
                  elements: {
                    footerAction: { display: 'none' }
                  }
                }}
              />
            </div>
          </section>
        </main>
      </SignedOut>
    </>
  );
}

function AuthenticatedApp() {
  const { user: clerkUser } = useUser();
  const [activeView, setActiveView] = useState('dashboard');

  const sync = useQuery({
    queryKey: ['sync'],
    queryFn: () => api.sync({ email: clerkUser?.primaryEmailAddress?.emailAddress, name: clerkUser?.fullName }),
    enabled: !!clerkUser,
    retry: false,
  });

  const session = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: false,
    enabled: sync.isSuccess
  });

  if (session.isLoading || sync.isLoading) return <div className="screen-message">Opening workspace...</div>;
  if (sync.isError) return <div className="screen-message error">Account configuration error. Please contact admin.</div>;
  if (!session.data) return <div className="screen-message error">Failed to load session</div>;

  return (
    <Shell user={session.data} activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'dashboard' && <Dashboard user={session.data} />}
      {activeView === 'branches' && <Branches user={session.data} />}
      {activeView === 'courses' && <Courses user={session.data} />}
      {activeView === 'staff' && session.data.role === 'SUPER_ADMIN' && <Staff />}
      {activeView === 'students' && <Students user={session.data} />}
      {activeView === 'billing' && <Billing />}
      {activeView === 'expenses' && <Expenses user={session.data} />}
    </Shell>
  );
}
