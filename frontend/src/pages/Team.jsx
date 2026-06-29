import { useState, useEffect } from 'react';
import { orgAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Trash2, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'agent' });

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    try {
      const { data } = await orgAPI.getMembers();
      setMembers(data.members);
    } catch {
      console.log('Failed to fetch members');
    } finally { setLoading(false); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const { data } = await authAPI.invite(inviteForm);
      toast.success(data.message || `Invite sent to ${inviteForm.email}`);
      setShowInvite(false);
      setInviteForm({ name: '', email: '', role: 'agent' });
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to invite'); }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await orgAPI.updateMember(id, { isActive: !isActive });
      toast.success(isActive ? 'Deactivated' : 'Activated');
      fetchMembers();
    } catch { toast.error('Failed to update'); }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this member?')) return;
    try {
      await orgAPI.removeMember(id);
      toast.success('Member removed');
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
  };

  const roleColors = { admin: 'badge-primary', agent: 'badge-info' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Team</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{members.length} members</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => setShowInvite(true)}><UserPlus size={14} /> Invite Member</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {members.map(member => (
            <div key={member._id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: 'white'
                }}>
                  {member.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                </div>
                <span className={`badge ${roleColors[member.role]}`}>{member.role}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{member.currentWorkload || 0}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Workload</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: !member.isActive ? 'var(--danger)' : (!member.lastLogin ? 'var(--warning)' : 'var(--success)') }}>
                    {!member.isActive ? 'Inactive' : (!member.lastLogin ? 'Pending' : 'Active')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Status</div>
                </div>
              </div>

              {member.expertise?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {member.expertise.map((e, i) => <span key={i} className="badge badge-primary" style={{ fontSize: 10 }}>{e}</span>)}
                </div>
              )}

              {member.lastLogin && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Last login: {new Date(member.lastLogin).toLocaleString()}
                </div>
              )}

              {user?.role === 'admin' && member._id !== user._id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 12 }} onClick={() => handleToggleActive(member._id, member.isActive)}>
                    <Shield size={12} /> {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleRemove(member._id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 440, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Invite Team Member</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input className="input" placeholder="Full name" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} required />
              <input className="input" type="email" placeholder="Email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} required />
              <select className="input" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
