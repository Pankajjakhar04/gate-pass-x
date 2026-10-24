import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

function passTypeLabel(type) {
  if (type === 'employee') return 'Employee';
  if (type === 'dependent') return 'Dependent';
  return 'Visitor';
}

function subjectInfo(pass) {
  if (pass.passType === 'visitor' && pass.visitor) {
    return { name: pass.visitor.name, detail: pass.visitor.purpose || 'Visitor access', photo: pass.visitor.photo };
  }
  if (pass.passType === 'dependent' && pass.dependent) {
    return { name: pass.dependent.name, detail: pass.dependent.relationship || 'Dependent', photo: pass.dependent.photo };
  }
  if (pass.employee) {
    const emp = pass.employee;
    return { name: emp.name, detail: `${emp.employeeId || ''} · ${emp.department || ''}`.replace(/^ · | · $/g, ''), photo: emp.photo };
  }
  return { name: 'Unknown', detail: '', photo: null };
}

export default function HistoryPassCard({ pass }) {
  const cardRef = useRef(null);
  const inactive = pass.status !== 'active' || new Date(pass.validUntil) < new Date();
  const { name, detail, photo } = subjectInfo(pass);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      // Temporarily remove hover transforms and grayscale for a clean capture
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
      link.download = `${pass.passId || 'pass'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Fallback: alert the user
      alert('Unable to download pass. Please try again.');
    }
  }, [pass.passId]);

  return (
    <div className="history-pass-wrapper">
      <article
        ref={cardRef}
        className={`pass-card ${pass.passType === 'visitor' ? 'visitor-pass-card' : ''} ${inactive ? 'pass-card-inactive' : ''}`}
        aria-label={`${name} ${passTypeLabel(pass.passType)} pass`}
      >
        <header className="pass-header">
          <span>Gate Pass Portal</span>
          <strong>{passTypeLabel(pass.passType)}</strong>
        </header>

        {photo?.url
          ? <img className="pass-photo" src={photo.url} alt={name} crossOrigin="anonymous" />
          : <div className="pass-photo pass-photo-empty" aria-label="No photo">Photo</div>
        }

        <h2>{name}</h2>
        {detail && <p className="pass-detail">{detail}</p>}

        {!inactive && pass.qrPayload && (
          <QRCodeSVG value={pass.qrPayload} size={144} level="M" className="pass-qr" />
        )}

        <p className="pass-id">{pass.passId}</p>

        <dl className="pass-validity">
          <div><dt>Valid from</dt><dd>{formatDate(pass.validFrom)}</dd></div>
          <div><dt>Valid until</dt><dd>{formatDate(pass.validUntil)}</dd></div>
        </dl>

        <footer>
          Generated {formatDate(pass.generatedAt)} · <strong>{inactive ? pass.status : 'Active'}</strong>
        </footer>

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
