import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function Security() {
  const [guards, setGuards] = useState([]);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await client.get('/admin/users');
      setGuards(data.data.filter((user) => user.role === 'security'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load security accounts');
    }
  }

  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault();
    setError('');
    try {
      await client.post('/admin/users', { ...form, role: 'security' });
      setForm({ email: '', password: '' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create security account');
    }
  }

  async function toggle(guard) {
    try {
      await client.patch(`/admin/users/${guard._id}/status`, { isActive: !guard.isActive });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update security account');
    }
  }

  return <main className="shell"><section className="panel wide-panel"><p className="eyebrow">Admin workspace</p><h1>Security guards</h1><p className="intro">Generate credentials for guards who verify QR passes and manage gate entry.</p><form onSubmit={create} className="form-stack inline-form"><label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Temporary password<input required minLength="10" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button type="submit">Generate credentials</button></form>{error && <p className="form-error" role="alert">{error}</p>}<div className="dependent-list">{guards.map((guard) => <div className="user-row" key={guard._id}><span>{guard.email} · {guard.isActive ? 'Active' : 'Inactive'}</span><button type="button" onClick={() => toggle(guard)}>{guard.isActive ? 'Deactivate' : 'Activate'}</button></div>)}</div></section></main>;
}