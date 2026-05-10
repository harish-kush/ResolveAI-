import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketAPI } from '../services/api';
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = { open: 'badge-warning', pending: 'badge-info', in_progress: 'badge-primary', resolved: 'badge-success', closed: 'badge-danger' };
const priorityColors = { low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-danger' };

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium', customer: { name: '', email: '' } });

  useEffect(() => { fetchTickets(); }, [page, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const { data } = await ticketAPI.getAll(params);
      setTickets(data.tickets);
      setTotal(data.total);
      setPages(data.pages);
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await ticketAPI.create(newTicket);
      toast.success('Ticket created');
      setShowCreate(false);
      setNewTicket({ subject: '', description: '', priority: 'medium', customer: { name: '', email: '' } });
      fetchTickets();
    } catch { toast.error('Failed to create ticket'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Tickets</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{total} total tickets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Ticket</button>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </form>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['open','pending','in_progress','resolved','closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All Priority</option>
          {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticket ID', 'Subject', 'Customer', 'Status', 'Priority', 'Assigned To', 'Created'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No tickets found</td></tr>
              ) : tickets.map(ticket => (
                <tr key={ticket._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <Link to={`/dashboard/tickets/${ticket._id}`} style={{ color: 'var(--primary-light)', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>{ticket.ticketId}</Link>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 500, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{ticket.customer?.name || 'Unknown'}</td>
                  <td style={{ padding: '14px 16px' }}><span className={`badge ${statusColors[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span></td>
                  <td style={{ padding: '14px 16px' }}><span className={`badge ${priorityColors[ticket.priority]}`}>{ticket.priority}</span></td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{ticket.assignedTo?.name || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn-secondary" style={{ padding: '8px 12px' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page} of {pages}</span>
            <button className="btn-secondary" style={{ padding: '8px 12px' }} disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Create Ticket</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input" placeholder="Subject" value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} required />
              <textarea className="input" placeholder="Description" rows={4} value={newTicket.description} onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" placeholder="Customer name" value={newTicket.customer.name} onChange={e => setNewTicket(p => ({ ...p, customer: { ...p.customer, name: e.target.value } }))} />
                <input className="input" placeholder="Customer email" type="email" value={newTicket.customer.email} onChange={e => setNewTicket(p => ({ ...p, customer: { ...p.customer, email: e.target.value } }))} />
              </div>
              <select className="input" value={newTicket.priority} onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}>
                {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
