import { useEffect, useState } from 'react';
import client from '../../api/client';
import HistoryPassCard from '../../components/HistoryPassCard';

export default function Passes() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/passes');
      setPasses(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load pass history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(passId) {
    setMessage('');
    setError('');
    try {
      await client.post(`/passes/${passId}/revoke`, { reason: 'Revoked by employee' });
      setMessage('Pass revoked successfully.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to revoke pass');
    }
  }

  async function deletePass(passId) {
    if (!window.confirm('Are you sure you want to permanently delete this pass? This action cannot be undone.')) return;
    setMessage('');
    setError('');
    try {
      await client.delete(`/passes/${passId}`);
      setMessage('Pass permanently deleted.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete pass');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Employee workspace</p>
        <h1>Pass history</h1>

        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading pass history...</p>}

        {!loading && passes.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No passes found in your history.</p>
        )}

        {!loading && passes.length > 0 && (
          <div className="pass-history">
            {passes.map((entry) => (
              <div key={entry.id || entry.passId}>
                <HistoryPassCard pass={entry} />
                <div className="pass-action-row">
                  {entry.status === 'active' && (
                    <button type="button" className="revoke-pass-btn" onClick={() => revoke(entry.passId)}>
                      Revoke
                    </button>
                  )}
                  <button type="button" className="delete-pass-btn" onClick={() => deletePass(entry.passId)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}