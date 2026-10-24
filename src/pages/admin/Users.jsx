import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'security' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await client.get('/admin/users');
      setUsers(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function toggleUser(user) {
    try {
      await client.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user');
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setError('');
    try {
      await client.post('/admin/users', form);
      setForm({ email: '', password: '', role: 'security' });
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create user');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <h1>User management</h1>
        <form onSubmit={createUser} className="form-stack inline-form">
          <label>
            Email
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <input required minLength="10" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit">Create account</button>
        </form>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading users...</p>}

        {!loading && users.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No users found.</p>
        )}

        {!loading && users.length > 0 && (
          <div className="user-list">
            {users.map((user) => (
              <div className="user-row" key={user._id}>
                <span>{user.email} · {user.role}</span>
                <button type="button" onClick={() => toggleUser(user)}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}