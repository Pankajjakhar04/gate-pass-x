import { useEffect, useState } from 'react';
import client from '../../api/client';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

export default function Inside() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(null); // passId being checked out

  async function load() {
    setError('');
    setLoading(true);
    try {
      const { data } = await client.get('/visitor-logs/inside');
      setLogs(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load inside list');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function checkout(passId, visitorName) {
    if (!window.confirm(`Check out ${visitorName}?`)) return;
    setError('');
    setCheckingOut(passId);
    try {
      await client.post('/visitor-logs/check-out', { passId });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to check out visitor');
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <main className="security-shell">
      <section className="panel wide-panel">
        <div className="sec-page-header">
          <div>
            <p className="eyebrow">Security workspace</p>
            <h1>Currently inside</h1>
          </div>
          <button type="button" className="sec-refresh-btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && logs.length === 0 && (
          <div className="sec-loading">
            <div className="verify-spinner" aria-hidden="true" />
            <p>Loading…</p>
          </div>
        )}

        {!loading && logs.length === 0 && !error && (
          <div className="sec-empty">
            <span className="sec-empty-icon" aria-hidden="true">🏢</span>
            <p>No visitors are currently inside.</p>
          </div>
        )}

        {logs.length > 0 && (
          <>
            <p className="sec-count">{logs.length} visitor{logs.length !== 1 ? 's' : ''} inside</p>
            <div className="inside-list">
              {logs.map((log) => {
                const visitor = log.visitor;
                const passId = log.pass?.passId;
                const isBusy = checkingOut === passId;
                return (
                  <div className="inside-card" key={log._id}>
                    <div className="inside-card-left">
                      {visitor?.photo?.url ? (
                        <img
                          className="inside-photo"
                          src={visitor.photo.url}
                          alt={visitor.name}
                        />
                      ) : (
                        <div className="inside-photo inside-photo-empty" aria-hidden="true">
                          👤
                        </div>
                      )}
                    </div>
                    <div className="inside-card-body">
                      <strong className="inside-name">{visitor?.name || '—'}</strong>
                      {visitor?.purpose && (
                        <span className="inside-purpose">{visitor.purpose}</span>
                      )}
                      {visitor?.phone && (
                        <span className="inside-meta">📞 {visitor.phone}</span>
                      )}
                      <span className="inside-meta">
                        Checked in: {formatDate(log.checkInAt)}
                      </span>
                      <span className="inside-meta mono">{passId}</span>
                    </div>
                    <div className="inside-card-actions">
                      <button
                        type="button"
                        className="action-checkout"
                        disabled={isBusy || loading}
                        onClick={() => checkout(passId, visitor?.name)}
                      >
                        {isBusy ? 'Checking out…' : '↑ Check out'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}