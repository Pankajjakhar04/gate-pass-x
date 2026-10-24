import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const lastScanRef = useRef('');
  const lastScanAtRef = useRef(0);

  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    if (!started) return undefined;
    let scanner;
    try {
      scanner = new Html5Qrcode('qr-reader');
    } catch (_error) {
      if (onErrorRef.current) onErrorRef.current('Scanner could not start. Use manual pass entry instead.');
      setStarted(false);
      return undefined;
    }
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanRef.current && now - lastScanAtRef.current < 3000) return;
          lastScanRef.current = decodedText;
          lastScanAtRef.current = now;
          if (onScanRef.current) onScanRef.current(decodedText);
        },
        () => {}
      )
      .catch(() => {
        if (onErrorRef.current) onErrorRef.current('Camera unavailable. Use manual pass entry instead.');
      });

    return () => {
      scanner.stop().catch(() => {});
      scanner.clear();
      scannerRef.current = null;
    };
  }, [started]);

  return (
    <div className="scan-stage" aria-label="QR code scanner">
      {!started && (
        <button type="button" className="camera-start" onClick={() => setStarted(true)}>
          Start camera scanner
        </button>
      )}
      <div className={started ? 'scan-frame' : 'scan-frame scan-frame-hidden'} aria-hidden="true">
        <span className="scan-corner scan-corner-tl" />
        <span className="scan-corner scan-corner-tr" />
        <span className="scan-corner scan-corner-bl" />
        <span className="scan-corner scan-corner-br" />
        <span className="scan-line" />
      </div>
      <div id="qr-reader" />
      <p className="scan-hint">
        {started ? 'Place the QR code inside the frame' : 'Use the camera scanner or enter a pass ID below'}
      </p>
    </div>
  );
}