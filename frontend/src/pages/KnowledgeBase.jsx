import { useState, useEffect, useRef } from 'react';
import { trainingAPI } from '../services/api';
import { Plus, Globe, FileText, HelpCircle, Trash2, Bot, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons = { faq: HelpCircle, document: FileText, article: FileText, webpage: Globe, notion: ExternalLink };
const typeColors = { faq: 'var(--warning)', document: 'var(--primary-light)', article: 'var(--success)', webpage: 'var(--info)', notion: 'var(--accent-light)' };

export default function KnowledgeBase() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showCrawl, setShowCrawl] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [filter, setFilter] = useState('');
  const [newItem, setNewItem] = useState({ type: 'faq', title: '', content: '', url: '' });
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testHistory, setTestHistory] = useState([]);
  const testEndRef = useRef(null);

  useEffect(() => { fetchData(); }, [filter]);
  useEffect(() => { testEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [testHistory, testing]);

  const fetchData = async () => {
    try {
      const params = {};
      if (filter) params.type = filter;
      const res = await trainingAPI.getAll(params);
      setData(res.data.data);
    } catch {} finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await trainingAPI.add(newItem);
      toast.success('Added to knowledge base');
      setShowAdd(false);
      setNewItem({ type: 'faq', title: '', content: '', url: '' });
      fetchData();
    } catch { toast.error('Failed to add'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await trainingAPI.delete(id);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleCrawl = async (e) => {
    e.preventDefault();
    setCrawling(true);
    try {
      const { data } = await trainingAPI.crawl({ url: crawlUrl, maxPages: 10 });
      toast.success(`Crawled ${data.pagesProcessed} pages`);
      setShowCrawl(false);
      setCrawlUrl('');
      fetchData();
    } catch { toast.error('Crawl failed'); }
    finally { setCrawling(false); }
  };

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    const userMsg = testQuery.trim();
    setTestHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setTestQuery('');
    setTesting(true);
    setTestResult(null);
    try {
      // Send chat history for conversation memory (only role + content)
      const historyForAPI = testHistory.map(({ role, content }) => ({ role, content }));
      const { data } = await trainingAPI.test({ query: userMsg, chatHistory: historyForAPI });
      setTestResult(data);
      setTestHistory(prev => [...prev, { role: 'assistant', content: data.response, confidence: data.confidence, sentiment: data.sentiment, intent: data.intent }]);
    } catch {
      toast.error('Test failed');
      setTestHistory(prev => [...prev, { role: 'assistant', content: 'Failed to get response. Please try again.', error: true }]);
    } finally { setTesting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Knowledge Base</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Train your AI with custom data</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={() => setShowTest(true)}><Bot size={14} /> Test AI</button>
          <button className="btn-secondary" onClick={() => setShowCrawl(true)}><Globe size={14} /> Crawl Website</button>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Content</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['', 'faq', 'document', 'article', 'webpage'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={filter === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: 12 }}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No training data yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Add FAQs, documents, or crawl your website to train the AI.</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Content</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {data.map(item => {
            const Icon = typeIcons[item.type] || FileText;
            return (
              <div key={item._id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${typeColors[item.type]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} style={{ color: typeColors[item.type] }} />
                    </div>
                    <div>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{item.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.content}
                </p>
                {item.url && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.url}</div>}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Add Training Data</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <select className="input" value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value }))}>
                {['faq', 'document', 'article'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input" placeholder="Title" value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} required />
              <textarea className="input" placeholder="Content" rows={6} value={newItem.content} onChange={e => setNewItem(p => ({ ...p, content: e.target.value }))} required style={{ resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCrawl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 500, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Crawl Website</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Extract content from your website pages to train the AI.</p>
            <form onSubmit={handleCrawl} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input" placeholder="https://your-website.com" value={crawlUrl} onChange={e => setCrawlUrl(e.target.value)} required />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCrawl(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={crawling}>{crawling ? 'Crawling...' : 'Start Crawl'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 600, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Test AI Response</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {testHistory.length > 0 && (
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => { setTestHistory([]); setTestResult(null); }}>New Chat</button>
                )}
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => { setShowTest(false); setTestResult(null); setTestHistory([]); }}>Close</button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300 }}>
              {testHistory.length === 0 && !testing && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <Bot size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontSize: 14 }}>Ask a question to test the AI assistant</p>
                  <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>The AI remembers your conversation context</p>
                </div>
              )}

              {testHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                    background: msg.role === 'user' ? 'var(--primary)' : msg.error ? 'rgba(239,68,68,0.1)' : 'var(--bg-tertiary)',
                    color: msg.role === 'user' ? 'white' : msg.error ? 'var(--error)' : 'var(--text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)'
                  }}>
                    {msg.role === 'assistant' && !msg.error && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Bot size={12} /> AI Assistant
                      </div>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{msg.content}</div>
                    {msg.role === 'assistant' && !msg.error && msg.confidence !== undefined && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>Confidence: {(msg.confidence * 100).toFixed(0)}%</span>
                        <span className="badge badge-info" style={{ fontSize: 10 }}>Sentiment: {msg.sentiment}</span>
                        <span className="badge badge-warning" style={{ fontSize: 10 }}>Intent: {msg.intent}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {testing && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '12px 18px', borderRadius: 14,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <Bot size={14} style={{ color: 'var(--accent-light)' }} />
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>AI is thinking</span>
                    <span style={{ display: 'inline-flex', gap: 3 }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-light)',
                          animation: `thinkingBounce 1.4s ease-in-out ${i * 0.2}s infinite`
                        }} />
                      ))}
                    </span>
                    <style>{`@keyframes thinkingBounce { 0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }`}</style>
                  </div>
                </div>
              )}

              <div ref={testEndRef} />
            </div>

            <form onSubmit={handleTest} style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Ask a question..." value={testQuery} onChange={e => setTestQuery(e.target.value)} disabled={testing} style={{ flex: 1 }} />
              <button type="submit" className="btn-primary" style={{ flexShrink: 0, padding: '10px 20px' }} disabled={testing}>
                {testing ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
