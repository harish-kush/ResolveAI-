import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analyticsAPI, ticketAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Ticket, MessageSquare, Clock, TrendingUp, Bot, Users, AlertCircle, CheckCircle } from 'lucide-react';

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await analyticsAPI.dashboard();
      setStats(data);
    } catch (err) {
      setStats({
        totalTickets: 0, openTickets: 0, resolvedTickets: 0, avgResponseTime: 0,
        totalConversations: 0, aiHandledQueries: 0, humanHandledQueries: 0,
        customerSatisfaction: 'N/A', resolutionRate: 0, ticketsByDay: [], ticketsByStatus: [], ticketsByPriority: []
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const statCards = stats ? [
    { icon: Ticket, label: 'Total Tickets', value: stats.totalTickets, color: 'var(--primary-light)', bg: 'rgba(37,99,235,0.1)' },
    { icon: AlertCircle, label: 'Open Tickets', value: stats.openTickets, color: 'var(--warning)', bg: 'rgba(245,158,11,0.1)' },
    { icon: CheckCircle, label: 'Resolved', value: stats.resolvedTickets, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
    { icon: Clock, label: 'Avg Response', value: `${stats.avgResponseTime}m`, color: 'var(--info)', bg: 'rgba(6,182,212,0.1)' },
    { icon: Bot, label: 'AI Queries', value: stats.aiHandledQueries, color: 'var(--accent-light)', bg: 'rgba(139,92,246,0.1)' },
    { icon: Users, label: 'Human Queries', value: stats.humanHandledQueries, color: 'var(--primary-light)', bg: 'rgba(59,130,246,0.1)' },
    { icon: TrendingUp, label: 'Resolution Rate', value: `${stats.resolutionRate}%`, color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
    { icon: MessageSquare, label: 'Conversations', value: stats.totalConversations, color: 'var(--info)', bg: 'rgba(6,182,212,0.1)' }
  ] : [];

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="gradient-text" style={{ fontSize: 18, fontWeight: 600 }}>Loading dashboard...</div>
    </div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Welcome back, <span className="gradient-text">{user?.name}</span></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Here's what's happening with your support system.</p>
      </div>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map((card, i) => (
          <motion.div key={i} variants={fadeIn} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{card.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{card.value}</div>
          </motion.div>
        ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }} className="max-md:!grid-cols-1">
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tickets This Week</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={stats?.ticketsByDay?.map(d => ({ date: d._id?.slice(5), count: d.count })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="count" fill="url(#gradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>By Status</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats?.ticketsByStatus?.map(s => ({ name: s._id, value: s.count })) || []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {stats?.ticketsByStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {stats?.ticketsByStatus?.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                {s._id} ({s.count})
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="max-md:!grid-cols-1">
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'View All Tickets', path: '/dashboard/tickets', icon: Ticket },
              { label: 'Live Conversations', path: '/dashboard/conversations', icon: MessageSquare },
              { label: 'Knowledge Base', path: '/dashboard/knowledge-base', icon: Bot },
              { label: 'View Analytics', path: '/dashboard/analytics', icon: TrendingUp }
            ].map((action, i) => (
              <Link key={i} to={action.path} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 10,
                background: 'var(--bg-tertiary)', textDecoration: 'none', color: 'var(--text-primary)',
                fontSize: 14, fontWeight: 500, transition: 'all 0.2s ease', border: '1px solid var(--border)'
              }}>
                <action.icon size={18} style={{ color: 'var(--primary-light)' }} />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Customer Satisfaction</h3>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 56, fontWeight: 900 }} className="gradient-text">{stats?.customerSatisfaction || 'N/A'}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>out of 5.0</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 16 }}>
              {[1,2,3,4,5].map(s => (
                <div key={s} style={{ width: 24, height: 24, borderRadius: 4, background: s <= Math.round(parseFloat(stats?.customerSatisfaction) || 0) ? 'var(--warning)' : 'var(--bg-tertiary)' }} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{stats?.aiHandledQueries || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>AI Handled</div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary-light)' }}>{stats?.humanHandledQueries || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Human Handled</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
