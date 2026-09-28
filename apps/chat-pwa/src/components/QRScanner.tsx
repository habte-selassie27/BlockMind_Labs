import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

function extractAddress(data: string): string | null {
  const match = data.match(/0x[a-fA-F0-9]{40}/);
  if (match) return match[0];
  const ens = data.match(/(?:https?:\/\/\S+\/)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/i);
  if (ens && !data.includes('://')) return ens[1];
  return null;
}

/** Camera QR scanner for pasting an address into view-only mode (mobile PWA). */
export default function QRScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;
    const canvas = document.createElement('canvas');
    setError('');

    (async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not available on this device');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        const tick = () => {
          if (cancelled) return;
          if (!video.videoWidth) {
            raf = requestAnimationFrame(tick);
            return;
          }
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(image.data, image.width, image.height);
            if (code?.data) {
              const found = extractAddress(code.data);
              if (found) {
                onScan(found);
                onClose();
                return;
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start camera');
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onScan, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Scan QR code">
      <div className="modal-content" style={{ width: 'min(420px, calc(100vw - 32px))' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--chat-text-primary)' }}>Scan address QR</div>
            <div style={{ fontSize: 12, color: 'var(--chat-text-tertiary)', marginTop: 2 }}>
              Point the camera at a wallet QR — no keys are read, only the address
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close scanner">✕</button>
        </div>

        <div className="modal-body">
          {error ? (
            <div style={{ padding: '22px 14px', textAlign: 'center', fontSize: 13, color: 'var(--chat-warning)', background: 'rgba(232,192,125,0.08)', border: '1px solid rgba(232,192,125,0.2)', borderRadius: 12 }}>
              {error}
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--chat-text-tertiary)' }}>You can still paste the address manually.</div>
            </div>
          ) : (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '4 / 3' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="vo-scan-frame" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (camera reads QR payloads only — no key material)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
