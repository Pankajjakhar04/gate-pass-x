import { useEffect, useRef, useState } from 'react';
import client from '../../api/client';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'inside', label: 'Currently inside' },
  { value: 'checked-out', label: 'Checked out' },
];

export default function Logs() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  async function fetchLogs(opts = {}) {
    const currentPage = opts.page ?? page;
    const currentQuery = opts.query ?? query;
    const currentStatus = opts.status ?? status;
    const currentFrom = opts.from ?? from;
    const currentTo = opts.to ?? to;

    setError('');
    setLoading(true);
    try {
      const params = { page: currentPage, limit: PAGE_SIZE };
      if (currentQuery.trim()) params.q = currentQuery.trim();
      if (currentStatus) params.status = currentStatus;
      if (currentFrom) params.from = new Date(currentFrom).toISOString();
      if (currentTo) {
        // Include the entire selected "to" day
        const end = new Date(currentTo);
        end.setHours(23, 59, 59, 999);
        params.to = end.toISOString();
      }
      const { data } = await client.get('/visitor-logs', { params });
      setLogs(data.data);
      setTotal(data.meta?.total ?? data.data.length);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load logs');
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => { fetchLogs({ page: 1 }); }, []);

  // Debounced search when query changes
  function handleQueryChange(event) {
    const value = event.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs({ query: value, page: 1 });
    }, 400);
  }

  function handleFilterChange(setter, key) {
    return (event) => {
      const value = event.target.value;
      setter(value);
      setPage(1);
      fetchLogs({ [key]: value, page: 1 });
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearTimeout(debounceRef.current);
    setPage(1);
    fetchLogs({ page: 1 });
  }

  function goToPage(newPage) {
    setPage(newPage);
    fetchLogs({ page: newPage });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="security-shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Security workspace</p>
        <h1>Visitor logs</h1>

        {/* ── Filters ── */}
        <form onSubmit={handleSubmit} className="logs-filter-bar">
          <label className="logs-filter-label">
            Search
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Visitor name or pass ID…"
              autoComplete="off"
            />
          </label>

          <label className="logs-filter-label">
            Status
            <select
              value={status}
              onChange={handleFilterChange(setStatus, 'status')}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="logs-filter-label">
            From
            <input
              type="date"
              value={from}
              onChange={handleFilterChange(setFrom, 'from')}
            />
          </label>

          <label className="logs-filter-label">
            To
            <input
              type="date"
              value={to}
              onChange={handleFilterChange(setTo, 'to')}
            />
          </label>

          <div className="logs-filter-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
            <button
              type="button"
              className="sec-clear-btn"
              disabled={loading}
              onClick={() => {
                setQuery(''); setStatus(''); setFrom(''); setTo(''); setPage(1);
                fetchLogs({ query: '', status: '', from: '', to: '', page: 1 });
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="sec-loading">
            <div className="verify-spinner" aria-hidden="true" />
            <p>Loading logs…</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && logs.length === 0 && !error && (
          <div className="sec-empty">
            <span className="sec-empty-icon" aria-hidden="true">🔍</span>
            <p>No logs found matching your filters.</p>
          </div>
        )}

        {/* ── Results ── */}
        {!loading && logs.length > 0 && (
          <>
            <p className="sec-count">
              Showing {logs.length} of {total} log{total !== 1 ? 's' : ''}
            </p>

            <div className="logs-table" role="list">
              {/* Header */}
              <div className="logs-row logs-header" role="none" aria-hidden="true">
                <span>Visitor</span>
                <span>Pass ID</span>
                <span>Check-in</span>
                <span>Check-out</span>
                <span>Status</span>
              </div>

              {logs.map((log) => {
                const isInside = !log.checkOutAt;
                return (
                  <div className="logs-row" role="listitem" key={log._id}>
                    <span className="logs-visitor-name">
                      {log.visitor?.photo?.url && (
                        <img
                          className="logs-avatar"
                          src={log.visitor.photo.url}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                      {log.visitor?.name || '—'}
                    </span>
                    <span className="mono logs-pass-id">{log.pass?.passId || '—'}</span>
                    <span>{formatDate(log.checkInAt)}</span>
                    <span>{log.checkOutAt ? formatDate(log.checkOutAt) : '—'}</span>
                    <span>
                      <span className={`logs-status-badge ${isInside ? 'badge-inside' : 'badge-out'}`}>
                        {isInside ? 'Inside' : 'Out'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="logs-pagination">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  ← Previous
                </button>
                <span className="logs-page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}