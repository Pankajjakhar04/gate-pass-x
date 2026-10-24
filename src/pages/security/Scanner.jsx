import { useCallback, useRef, useState } from 'react';
import client from '../../api/client';
import QRScanner from '../../components/QRScanner';

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

const PASS_TYPE_LABEL = { employee: 'Employee', dependent: 'Dependent', visitor: 'Visitor' };

export default function Scanner() {
  const [manual, setManual] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const lastVerifiedRef = useRef('');

  const verify = useCallback(async (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return;
    // Debounce identical consecutive QR scans
    if (trimmed === lastVerifiedRef.current) return;
    lastVerifiedRef.current = trimmed;

    setError('');
    setActionSuccess('');
    setLoading(true);
    try {
      const body = trimmed.startsWith('{') ? { qrToken: trimmed } : { passId: trimmed };
      const { data } = await client.post('/passes/verify', body);
      setResult(data.data);
    } catch (requestError) {
      setResult(null);
      setError(requestError.response?.data?.message || 'Unable to verify pass');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleManualSubmit(event) {
    event.preventDefault();
    lastVerifiedRef.current = ''; // allow re-verify of same value when manual
    verify(manual);
  }

  async function performAction() {
    setActionBusy(true);
    setError('');
    setActionSuccess('');
    const action = result.nextAction === 'check-in' ? 'check-in' : 'check-out';
    try {
      await client.post(`/visitor-logs/${action}`, { passId: result.pass.passId });
      const label = action === 'check-in' ? 'Checked in' : 'Checked out';
      setActionSuccess(`${label} successfully.`);
      // Re-verify to refresh nextAction state
      lastVerifiedRef.current = '';
      await verify(result.pass.passId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to complete gate action');
    } finally {
      setActionBusy(false);
    }
  }

  function clearResult() {
    setResult(null);
    setError('');
    setActionSuccess('');
    setManual('');
    lastVerifiedRef.current = '';
  }

  const subject = result?.valid ? result.subject : null;
  const pass = result?.valid ? result.pass : null;

  return (
    <main className="security-shell">
      <div className="security-grid">

        {/* ── Left: Scanner + Manual entry ── */}
        <section className="scanner-panel">
          <p className="eyebrow">Gate verification</p>
          <h1>Scan pass</h1>

          <QRScanner onScan={verify} onError={setError} />

          <form onSubmit={handleManualSubmit} className="manual-form">
            <label>
              Manual pass ID or QR payload
              <input
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                placeholder="e.g. VP-20261023-AB12CD"
                autoComplete="off"
              />
            </label>
            <div className="scanner-actions">
              <button type="submit" disabled={loading || !manual.trim()}>
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              {(result || error) && (
                <button type="button" className="sec-clear-btn" onClick={clearResult}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Right: Verification result ── */}
        <section
          className={`verification-result${result?.valid ? ' result-valid' : result ? ' result-invalid' : ''}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Idle state */}
          {!result && !error && !loading && (
            <div className="verify-idle">
              <div className="verify-idle-icon" aria-hidden="true">🪪</div>
              <p>Scan a QR code or enter a pass ID to verify.</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="verify-idle">
              <div className="verify-spinner" aria-hidden="true" />
              <p>Verifying pass…</p>
            </div>
          )}

          {/* Error (no result) */}
          {error && !result && (
            <p className="form-error" role="alert">{error}</p>
          )}

          {/* Result */}
          {result && (
            <>
              <span className="result-banner">
                {result.valid ? '✓ VALID' : '✗ INVALID'}
              </span>

              {/* Error overlay on top of result */}
              {error && (
                <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>
              )}
              {actionSuccess && (
                <p className="success-message" role="status" style={{ marginTop: 12 }}>{actionSuccess}</p>
              )}

              {/* Subject photo */}
              {subject?.photo?.url && (
                <img
                  className="verification-photo"
                  src={subject.photo.url}
                  alt={subject.name}
                />
              )}

              <h2>{result.valid ? subject?.name : result.message}</h2>

              {result.valid ? (
                <>
                  <p className="verify-ref-emp">
                    {result.referenceEmployee.name} · {result.referenceEmployee.department}
                  </p>

                  <dl className="verify-dl">
                    <div>
                      <dt>Pass type</dt>
                      <dd>{PASS_TYPE_LABEL[pass.passType] || pass.passType}</dd>
                    </div>
                    <div>
                      <dt>Pass ID</dt>
                      <dd className="mono">{pass.passId}</dd>
                    </div>
                    {subject?.purpose && (
                      <div><dt>Purpose</dt><dd>{subject.purpose}</dd></div>
                    )}
                    {subject?.relationship && (
                      <div><dt>Relationship</dt><dd>{subject.relationship}</dd></div>
                    )}
                    {subject?.phone && (
                      <div><dt>Phone</dt><dd>{subject.phone}</dd></div>
                    )}
                    <div>
                      <dt>Status</dt>
                      <dd className={`pass-status-badge pass-status-${pass.status}`}>
                        {pass.status}
                      </dd>
                    </div>
                    <div><dt>Valid from</dt><dd>{formatDate(pass.validFrom)}</dd></div>
                    <div><dt>Valid until</dt><dd>{formatDate(pass.validUntil)}</dd></div>
                    <div><dt>Generated</dt><dd>{formatDate(pass.generatedAt)}</dd></div>
                  </dl>

                  {result.nextAction && (
                    <div className="verify-action-row">
                      <button
                        type="button"
                        disabled={actionBusy}
                        className={result.nextAction === 'check-in' ? 'action-checkin' : 'action-checkout'}
                        onClick={performAction}
                      >
                        {actionBusy
                          ? 'Updating…'
                          : result.nextAction === 'check-in'
                          ? '↓ Check in'
                          : '↑ Check out'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="verify-reason-code">{result.reason}</p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}