import { useState, useEffect } from 'react';
import { orgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Save, Code, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { organization, setOrganization } = useAuth();
  const [form, setForm] = useState({
    name: '', website: '', industry: '',
    widgetConfig: { themeColor: '#2563EB', position: 'bottom-right', welcomeMessage: '', companyName: '', suggestedPrompts: [] },
    aiConfig: { systemPrompt: '', confidenceThreshold: 0.6, temperature: 0.7 },
    settings: { autoAssign: true, autoReply: true, emailNotifications: true }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => { fetchOrg(); }, []);

  const fetchOrg = async () => {
    try {
      const { data } = await orgAPI.get();
      const org = data.organization;
      setForm({
        name: org.name || '', website: org.website || '', industry: org.industry || '',
        widgetConfig: { ...form.widgetConfig, ...org.widgetConfig },
        aiConfig: { ...form.aiConfig, ...org.aiConfig },
        settings: { ...form.settings, ...org.settings }
      });
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await orgAPI.update(form);
      setOrganization(data.organization);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const addPrompt = () => {
    if (!newPrompt.trim()) return;
    setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, suggestedPrompts: [...p.widgetConfig.suggestedPrompts, newPrompt] } }));
    setNewPrompt('');
  };

  const removePrompt = (i) => {
    setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, suggestedPrompts: p.widgetConfig.suggestedPrompts.filter((_, idx) => idx !== i) } }));
  };

  const widgetScript = `<script src="${window.location.origin}/widget.js" data-org="${organization?.slug || 'your-org'}"></script>`;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Configure your organization</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['general', 'widget', 'ai', 'embed'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'} style={{ padding: '10px 20px', fontSize: 13, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>General Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Organization Name</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Website</label>
              <input className="input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://your-website.com" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Industry</label>
              <input className="input" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="SaaS, E-commerce, etc." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'autoAssign', label: 'Auto-assign tickets to agents' },
                { key: 'autoReply', label: 'Enable AI auto-reply' },
                { key: 'emailNotifications', label: 'Send email notifications' }
              ].map(toggle => (
                <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div onClick={() => setForm(p => ({ ...p, settings: { ...p.settings, [toggle.key]: !p.settings[toggle.key] } }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: form.settings[toggle.key] ? 'var(--primary)' : 'var(--bg-tertiary)', padding: 2, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: form.settings[toggle.key] ? 'translateX(20px)' : 'translateX(0)', transition: 'all 0.2s' }} />
                  </div>
                  <span style={{ fontSize: 14 }}>{toggle.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'widget' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}><Palette size={20} style={{ display: 'inline', marginRight: 8 }} />Widget Customization</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Theme Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.widgetConfig.themeColor} onChange={e => setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, themeColor: e.target.value } }))} style={{ width: 48, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                <input className="input" value={form.widgetConfig.themeColor} onChange={e => setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, themeColor: e.target.value } }))} style={{ width: 120 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Company Name</label>
              <input className="input" value={form.widgetConfig.companyName} onChange={e => setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, companyName: e.target.value } }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Welcome Message</label>
              <input className="input" value={form.widgetConfig.welcomeMessage} onChange={e => setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, welcomeMessage: e.target.value } }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Position</label>
              <select className="input" value={form.widgetConfig.position} onChange={e => setForm(p => ({ ...p, widgetConfig: { ...p.widgetConfig, position: e.target.value } }))}>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Suggested Prompts</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {form.widgetConfig.suggestedPrompts?.map((p, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-tertiary)', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)' }}>
                    {p}
                    <button onClick={() => removePrompt(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="Add a prompt..." value={newPrompt} onChange={e => setNewPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPrompt())} />
                <button type="button" className="btn-secondary" onClick={addPrompt} style={{ flexShrink: 0 }}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>AI Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>System Prompt</label>
              <textarea className="input" rows={4} value={form.aiConfig.systemPrompt} onChange={e => setForm(p => ({ ...p, aiConfig: { ...p.aiConfig, systemPrompt: e.target.value } }))} placeholder="You are a helpful customer support assistant..." style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Confidence Threshold ({(form.aiConfig.confidenceThreshold * 100).toFixed(0)}%)</label>
              <input type="range" min="0" max="1" step="0.05" value={form.aiConfig.confidenceThreshold} onChange={e => setForm(p => ({ ...p, aiConfig: { ...p.aiConfig, confidenceThreshold: parseFloat(e.target.value) } }))} style={{ width: '100%' }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Below this threshold, the AI will escalate to a human agent.</p>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Temperature ({form.aiConfig.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" value={form.aiConfig.temperature} onChange={e => setForm(p => ({ ...p, aiConfig: { ...p.aiConfig, temperature: parseFloat(e.target.value) } }))} style={{ width: '100%' }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Higher = more creative, Lower = more focused.</p>
            </div>
          </div>
        </div>
      )}

      {tab === 'embed' && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}><Code size={20} style={{ display: 'inline', marginRight: 8 }} />Embed Widget</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Add this script tag to your website to embed the ResolveAI chatbot widget.</p>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 13, color: 'var(--primary-light)', wordBreak: 'break-all', lineHeight: 1.8 }}>
            {widgetScript}
          </div>
          <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => { navigator.clipboard.writeText(widgetScript); toast.success('Copied!'); }}>
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
