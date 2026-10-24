import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function Passes() {
  const [passes, setPasses] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    client
      .get('/admin/passes', { params: status ? { status } : {} })
      .then(({ data }) => setPasses(data.data))
      .catch(() => setError('Unable to load passes'))
      .finally(() => setLoading(false));
  }, [status]);

  async function revoke(passId) {
    try {
      await client.post(`/passes/${passId}/revoke`, { reason: 'Revoked by admin' });
      setPasses(passes.map((pass) => (pass.passId === passId ? { ...pass, status: 'revoked' } : pass)));
    } catch (_error) {
      setError('Unable to revoke pass');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Admin workspace</p>
        <h1>Pass monitor</h1>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading passes...</p>}

        {!loading && passes.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No passes found.</p>
        )}

        {!loading && passes.length > 0 && (
          <div className="dependent-list">
            {passes.map((pass) => (
              <div className="user-row" key={pass._id}>
                <span>{pass.passId} · {pass.passType} · {pass.status}</span>
                {pass.status === 'active' && (
                  <button type="button" onClick={() => revoke(pass.passId)}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}