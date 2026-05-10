import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketAPI, chatAPI } from '../services/api';
import { ArrowLeft, Bot, Send, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = { open: 'badge-warning', pending: 'badge-info', in_progress: 'badge-primary', resolved: 'badge-success', closed: 'badge-danger' };

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('conversation');

  useEffect(() => { fetchTicket(); }, [id]);

  const fetchTicket = async () => {
    try {
      const { data } = await ticketAPI.getOne(id);
      setTicket(data.ticket);
      if (data.ticket.conversation) {
        const msgRes = await chatAPI.getMessages(data.ticket.conversation._id || data.ticket.conversation);
        setMessages(msgRes.data.messages);
      }
    } catch { toast.error('Failed to load ticket'); }
    finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !ticket.conversation) return;
    try {
      const convId = ticket.conversation._id || ticket.conversation;
      await chatAPI.sendMessage(convId, { content: newMessage });
      setNewMessage('');
      fetchTicket();
    } catch { toast.error('Failed to send message'); }
  };

  const handleStatusChange = async (status) => {
    try {
      const { data } = await ticketAPI.update(id, { status });
      setTicket(data.ticket);
      toast.success(`Status updated to ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      const { data } = await ticketAPI.addNote(id, { content: note });
      setTicket(data.ticket);
      setNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const handleAISummary = async () => {
    try {
      toast.loading('Generating AI summary...', { id: 'summary' });
      const { data } = await ticketAPI.getAISummary(id);
      setTicket(prev => ({ ...prev, aiSummary: data.summary }));
      toast.success('Summary generated', { id: 'summary' });
    } catch { toast.error('Failed to generate summary', { id: 'summary' }); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!ticket) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Ticket not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/dashboard/tickets')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
        <ArrowLeft size={16} /> Back to Tickets
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }} className="max-md:!grid-cols-1">
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{ticket.ticketId}</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{ticket.subject}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`badge ${statusColors[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                  <span className={`badge badge-${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'danger' : 'warning'}`}>{ticket.priority}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handleAISummary}><Bot size={14} /> AI Summary</button>
              </div>
            </div>
            {ticket.aiSummary && (
              <div style={{ marginTop: 16, padding: 16, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 6 }}>AI Summary</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ticket.aiSummary}</div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {['conversation', 'notes'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '14px 20px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
                  color: tab === t ? 'var(--primary-light)' : 'var(--text-muted)', cursor: 'pointer',
                  borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent'
                }}>{t === 'conversation' ? 'Conversation' : 'Internal Notes'}</button>
              ))}
            </div>

            {tab === 'conversation' ? (
              <div>
                <div style={{ maxHeight: 400, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No messages yet</div>
                  ) : messages.map(msg => (
                    <div key={msg._id} style={{ display: 'flex', justifyContent: msg.sender.type === 'customer' ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 16px', borderRadius: 14,
                        background: msg.sender.type === 'customer' ? 'var(--bg-tertiary)' : msg.sender.type === 'ai' ? 'rgba(124,58,237,0.12)' : 'rgba(37,99,235,0.12)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: msg.sender.type === 'ai' ? 'var(--accent-light)' : 'var(--primary-light)', marginBottom: 4 }}>
                          {msg.sender.name || msg.sender.type}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>{msg.content}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(msg.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Type a reply..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                  <button type="submit" className="btn-primary" style={{ padding: '10px 16px', flexShrink: 0 }}><Send size={16} /></button>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ maxHeight: 300, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No notes yet</div>
                  ) : ticket.internalNotes.map((n, i) => (
                    <div key={i} style={{ padding: 14, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>{n.author?.name || 'Agent'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{n.content}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddNote} style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Add internal note..." value={note} onChange={e => setNote(e.target.value)} />
                  <button type="submit" className="btn-secondary" style={{ padding: '10px 16px', flexShrink: 0 }}><StickyNote size={16} /></button>
                </form>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Customer', value: ticket.customer?.name || 'Unknown' },
                { label: 'Email', value: ticket.customer?.email || '—' },
                { label: 'Category', value: ticket.category || 'General' },
                { label: 'Source', value: ticket.source },
                { label: 'Agent', value: ticket.assignedTo?.name || 'Unassigned' },
                { label: 'Created', value: new Date(ticket.createdAt).toLocaleString() },
                { label: 'Sentiment', value: ticket.sentiment || '—' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['open', 'pending', 'in_progress', 'resolved', 'closed'].map(s => (
                <button key={s} onClick={() => handleStatusChange(s)} disabled={ticket.status === s}
                  className="btn-secondary" style={{
                    width: '100%', justifyContent: 'center', padding: '10px', fontSize: 12,
                    opacity: ticket.status === s ? 0.5 : 1, textTransform: 'capitalize'
                  }}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {ticket.tags?.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ticket.tags.map((tag, i) => (
                  <span key={i} className="badge badge-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
