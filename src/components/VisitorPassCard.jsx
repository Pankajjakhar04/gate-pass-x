import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';

function formatDate(value) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)); }

export default function VisitorPassCard({ visitor, pass }) {
  const cardRef = useRef(null);
  const inactive = pass.status !== 'active' || new Date(pass.validUntil) < new Date();

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
      link.download = `${pass.passId || 'visitor-pass'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert('Unable to download pass. Please try again.');
    }
  }, [pass.passId]);

  return (
    <div className="history-pass-wrapper">
      <article ref={cardRef} className={`pass-card visitor-pass-card ${inactive ? 'pass-card-inactive' : ''}`}>
        <header className="pass-header"><span>Gate Pass Portal</span><strong>Visitor</strong></header>
        {visitor?.photo?.url ? <img className="pass-photo" src={visitor.photo.url} alt={visitor.name} crossOrigin="anonymous" /> : <div className="pass-photo pass-photo-empty">Photo</div>}
        <h2>{visitor?.name}</h2><p className="pass-detail">{visitor?.purpose || 'Visitor access'}</p>
        {!inactive && <QRCodeSVG value={pass.qrPayload} size={144} level="M" className="pass-qr" />}
        <p className="pass-id">{pass.passId}</p><p className="pass-detail">Valid until {formatDate(pass.validUntil)}</p>
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