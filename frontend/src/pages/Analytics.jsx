import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [detailed, setDetailed] = useState(null);
  const [period, setPeriod] = useState('30');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => { fetchAll(); }, [period]);

  const fetchAll = async () => {
    try {
      const [statsRes, detailedRes] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.detailed({ period })
      ]);
      setStats(statsRes.data);
      setDetailed(detailedRes.data);
    } catch {} finally { setLoading(false); }
  };

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
  const SENTIMENT_COLORS = { positive: '#10B981', neutral: '#F59E0B', negative: '#EF4444' };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Loading analytics...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Insights into your support performance</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: '7', l: '7 Days' }, { v: '30', l: '30 Days' }, { v: '90', l: '90 Days' }].map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)} className={period === p.v ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: 12 }}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats && [
          { label: 'Total Tickets', value: stats.totalTickets, color: 'var(--primary-light)' },
          { label: 'Resolution Rate', value: `${stats.resolutionRate}%`, color: 'var(--success)' },
          { label: 'Avg Response', value: `${stats.avgResponseTime}m`, color: 'var(--info)' },
          { label: 'Satisfaction', value: stats.customerSatisfaction, color: 'var(--warning)' },
          { label: 'AI Handled', value: stats.aiHandledQueries, color: 'var(--accent-light)' },
          { label: 'Conversations', value: stats.totalConversations, color: 'var(--info)' }
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }} className="max-md:!grid-cols-1">
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Ticket Trend</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={stats?.ticketsByDay?.map(d => ({ date: d._id?.slice(5), count: d.count })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Sentiment</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={detailed?.sentimentData?.map(s => ({ name: s._id, value: s.count })) || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {detailed?.sentimentData?.map((s, i) => <Cell key={i} fill={SENTIMENT_COLORS[s._id] || COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {detailed?.sentimentData?.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: SENTIMENT_COLORS[s._id] || COLORS[i] }} />
                {s._id} ({s.count})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="max-md:!grid-cols-1">
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Categories</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={detailed?.categoryData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                <YAxis type="category" dataKey="_id" stroke="var(--text-muted)" fontSize={12} width={80} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Agent Performance</h3>
          {(!detailed?.agentPerformance || detailed.agentPerformance.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No agent data available</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {detailed.agentPerformance.map((agent, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${COLORS[i % COLORS.length]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: COLORS[i % COLORS.length] }}>
                    {agent.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{agent.resolved}/{agent.totalTickets} resolved</div>
                  </div>
                  {agent.avgSatisfaction && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>★ {agent.avgSatisfaction.toFixed(1)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
