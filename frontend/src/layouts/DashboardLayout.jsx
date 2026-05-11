import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Ticket, MessageSquare, BookOpen, BarChart3, Settings, Users, LogOut, Menu, X, Zap } from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/dashboard/tickets', icon: Ticket, label: 'Tickets' },
  { path: '/dashboard/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/dashboard/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
  { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/dashboard/team', icon: Users, label: 'Team' },
  { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden"
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 60, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10, padding: 10, color: 'var(--text-primary)', cursor: 'pointer'
        }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          className="md:hidden"
        />
      )}

      <aside style={{
        width: 260, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.3s ease'
      }}
        className={`${!sidebarOpen ? 'max-md:!-translate-x-full' : ''}`}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800 }} className="gradient-text">ResolveAI</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ path, icon: Icon, label, end }) => {
            if (label === 'Analytics' && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={path}
                to={path}
                end={end}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  transition: 'all 0.2s ease'
                })}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '0 8px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white'
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: 260, overflow: 'auto', background: 'var(--bg-primary)' }}
        className="max-md:!ml-0"
      >
        <div style={{ padding: '24px 32px', minHeight: '100vh' }} className="max-md:!px-4 max-md:!pt-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
