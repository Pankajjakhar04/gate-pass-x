import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(event) {
    if (event) event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get('/visitor-logs', { params: { q: query } });
      setLogs(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Admin workspace</p>
        <h1>Visitor logs</h1>
        <form onSubmit={load} className="manual-form">
          <label>
            Search name or pass ID
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="submit" disabled={loading}>Search</button>
        </form>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading logs...</p>}

        {!loading && logs.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No visitor logs found.</p>
        )}

        {!loading && logs.length > 0 && (
          <div className="dependent-list">
            {logs.map((log) => (
              <div className="user-row" key={log._id}>
                <span>{log.visitor?.name || 'Visitor'} · {log.pass?.passId || 'Pass'}</span>
                <span>{log.checkOutAt ? 'Checked out' : 'Inside'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}