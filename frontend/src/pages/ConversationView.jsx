import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, UserCheck, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConversationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchMessages(); }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('joinConversation', id);
    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('userTyping', (data) => {
      if (data.conversationId === id) {
        setTypingUser(data.user);
        setTyping(data.isTyping);
      }
    });
    socket.on('messagesRead', () => {
      setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    });
    return () => {
      socket.emit('leaveConversation', id);
      socket.off('newMessage');
      socket.off('userTyping');
      socket.off('messagesRead');
    };
  }, [socket, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data } = await chatAPI.getMessages(id);
      setMessages(data.messages);
      if (socket) socket.emit('messageRead', { conversationId: id });
    } catch { toast.error('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await chatAPI.sendMessage(id, { content: input });
      setInput('');
      if (socket) socket.emit('typing', { conversationId: id, isTyping: false });
    } catch { toast.error('Failed to send'); }
  };

  const handleTakeOver = async () => {
    try {
      await chatAPI.takeOver(id);
      toast.success('You\'ve taken over this conversation');
      fetchMessages();
    } catch { toast.error('Failed to take over'); }
  };

  const handleResolve = async () => {
    try {
      await chatAPI.resolve(id);
      toast.success('Conversation resolved and handed back to AI');
      navigate('/dashboard/conversations');
    } catch { toast.error('Failed to resolve conversation'); }
  };

  const handleTyping = (value) => {
    setInput(value);
    if (socket) socket.emit('typing', { conversationId: id, isTyping: value.length > 0 });
  };

  const getSenderStyle = (type) => {
    switch (type) {
      case 'customer': return { bg: 'var(--bg-tertiary)', align: 'flex-start', color: 'var(--text-primary)' };
      case 'ai': return { bg: 'rgba(124,58,237,0.1)', align: 'flex-end', color: 'var(--accent-light)' };
      case 'agent': return { bg: 'rgba(37,99,235,0.1)', align: 'flex-end', color: 'var(--primary-light)' };
      default: return { bg: 'rgba(100,116,139,0.1)', align: 'center', color: 'var(--text-muted)' };
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => navigate('/dashboard/conversations')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleResolve}>
            <span style={{ color: 'var(--success)' }}>✓</span> Resolve
          </button>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleTakeOver}>
            <UserCheck size={14} /> Take Over
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading messages...</div>
          ) : messages.map(msg => {
            const style = getSenderStyle(msg.sender.type);
            if (msg.sender.type === 'system') {
              return (
                <div key={msg._id} style={{ textAlign: 'center', padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {msg.content}
                </div>
              );
            }
            return (
              <div key={msg._id} style={{ display: 'flex', justifyContent: style.align }}>
                <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: 14, background: style.bg, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {msg.sender.type === 'ai' ? <Bot size={12} style={{ color: style.color }} /> : msg.sender.type === 'customer' ? <User size={12} style={{ color: style.color }} /> : null}
                    <span style={{ fontSize: 11, fontWeight: 600, color: style.color }}>{msg.sender.name || msg.sender.type}</span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>{msg.content}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    {msg.isRead && <span style={{ fontSize: 10, color: 'var(--primary-light)' }}>✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {typing && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
              {typingUser} is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Type your message..." value={input} onChange={e => handleTyping(e.target.value)} />
          <button type="submit" className="btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }}><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}
