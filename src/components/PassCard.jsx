import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

export default function PassCard({ employee, pass }) {
  const cardRef = useRef(null);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const card = cardRef.current;
      const prevFilter = card.style.filter;
      const prevTransform = card.style.transform;
      card.style.filter = 'none';
      card.style.transform = 'none';

      const dataUrl = await toPng(card, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: { transform: 'none', filter: 'none' }
      });

      card.style.filter = prevFilter;
      card.style.transform = prevTransform;

      const link = document.createElement('a');
      link.download = `${pass?.passId || employee?.employeeId || 'pass'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert('Unable to download pass. Please try again.');
    }
  }, [pass?.passId, employee?.employeeId]);

  if (!pass) {
    return (
      <article className="pass-card pass-card-inactive" aria-label={`${employee?.name || 'Employee'} pass unavailable`}>
        <header className="pass-header"><span>Gate Pass Portal</span><strong>Employee</strong></header>
        {employee?.photo?.url ? <img className="pass-photo" src={employee.photo.url} alt={employee.name} /> : <div className="pass-photo pass-photo-empty" aria-label="No employee photo">Photo</div>}
        <h2>{employee?.name || 'Employee'}</h2>
        <p className="pass-detail">{employee?.employeeId} · {employee?.department}</p>
        <div style={{ margin: '2rem auto', textAlign: 'center', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontWeight: 500, color: '#555' }}>No Active Pass</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#777' }}>Please contact an administrator to issue an access pass.</p>
        </div>
        <footer>Status · <strong>No Pass</strong></footer>
        <div className="pass-overlay" aria-hidden="true">NO PASS</div>
      </article>
    );
  }

  const inactive = pass.status !== 'active' || new Date(pass.validUntil) < new Date();
  return (
    <div className="history-pass-wrapper">
      <article ref={cardRef} className={`pass-card ${inactive ? 'pass-card-inactive' : ''}`} aria-label={`${employee.name} employee pass`}>
        <header className="pass-header"><span>Gate Pass Portal</span><strong>Employee</strong></header>
        {employee.photo?.url ? <img className="pass-photo" src={employee.photo.url} alt={employee.name} crossOrigin="anonymous" /> : <div className="pass-photo pass-photo-empty" aria-label="No employee photo">Photo</div>}
        <h2>{employee.name}</h2>
        <p className="pass-detail">{employee.employeeId} · {employee.department}</p>
        {!inactive && <QRCodeSVG value={pass.qrPayload} size={144} level="M" className="pass-qr" />}
        <p className="pass-id">{pass.passId}</p>
        <dl className="pass-validity">
          <div><dt>Valid from</dt><dd>{formatDate(pass.validFrom)}</dd></div>
          <div><dt>Valid until</dt><dd>{formatDate(pass.validUntil)}</dd></div>
        </dl>
        <footer>Generated {formatDate(pass.generatedAt)} · <strong>{inactive ? pass.status : 'Active'}</strong></footer>
        {inactive && <div className="pass-overlay" aria-hidden="true">{pass.status}</div>}
      </article>
      <button
        type="button"
        className="download-pass-btn"
        onClick={handleDownload}
        aria-label={`Download ${pass.passId} pass`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1v9m0 0L5 7m3 3l3-3M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Download pass
      </button>
    </div>
  );
}