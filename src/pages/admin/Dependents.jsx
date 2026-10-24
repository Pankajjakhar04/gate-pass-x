import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/admin/dependents');
      setDependents(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load approvals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, approved) {
    try {
      await client.patch(`/admin/dependents/${id}/approve`, { approved });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update approval');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Admin workspace</p>
        <h1>Dependent approvals</h1>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading dependents...</p>}

        {!loading && dependents.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No dependent approval requests found.</p>
        )}

        {!loading && dependents.length > 0 && (
          <div className="dependent-list">
            {dependents.map((dependent) => (
              <div className="user-row" key={dependent._id}>
                <span>
                  {dependent.name} · {dependent.relationship} · {dependent.status}
                </span>
                {dependent.status === 'pending' && (
                  <span>
                    <button type="button" onClick={() => decide(dependent._id, true)}>
                      Approve
                    </button>{' '}
                    <button type="button" onClick={() => decide(dependent._id, false)}>
                      Reject
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}