import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { MessageSquare, Bot, User, Clock } from 'lucide-react';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const socket = useSocket();

  useEffect(() => { fetchConversations(); }, [filter]);

  useEffect(() => {
    if (!socket) return;
    socket.on('newCustomerMessage', () => fetchConversations());
    socket.on('escalation', () => fetchConversations());
    return () => {
      socket.off('newCustomerMessage');
      socket.off('escalation');
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      const { data } = await chatAPI.getConversations(params);
      setConversations(data.conversations);
    } catch {} finally { setLoading(false); }
  };

  const getStatusColor = (status) => {
    const map = { active: 'var(--success)', waiting: 'var(--warning)', resolved: 'var(--primary-light)', closed: 'var(--text-muted)' };
    return map[status] || 'var(--text-muted)';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Conversations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage live customer chats</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'active', 'waiting', 'resolved'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={filter === s ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 16px', fontSize: 12 }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : conversations.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <MessageSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No conversations yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Conversations will appear here when customers start chatting.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map(conv => (
            <Link key={conv._id} to={`/dashboard/conversations/${conv._id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: conv.isAIHandled ? 'rgba(124,58,237,0.15)' : 'rgba(37,99,235,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {conv.isAIHandled ? <Bot size={20} style={{ color: 'var(--accent-light)' }} /> : <User size={20} style={{ color: 'var(--primary-light)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{conv.customer?.name || 'Visitor'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(conv.status) }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{conv.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage?.content || 'No messages yet'}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={10} /> {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString()}
                    </span>
                    {conv.ticket && <span>Ticket: {conv.ticket.ticketId}</span>}
                    {conv.isAIHandled && <span className="badge badge-primary" style={{ padding: '2px 8px', fontSize: 10 }}>AI</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
