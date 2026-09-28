import { useMemo } from 'react';
import { renderSVG } from 'uqr';

interface Props {
  value: string;
  size?: number;
  dark?: boolean;
}

/** QR code (uqr, zero-dependency encoder) for sharing a read-only watch link. */
export default function QRCode({ value, size = 168, dark = false }: Props) {
  const svg = useMemo(() => {
    if (!value) return '';
    try {
      return renderSVG(value, {
        ecc: 'M',
        border: 2,
        pixelSize: 5,
        blackColor: dark ? '#FAF9F5' : '#141413',
        whiteColor: dark ? '#1C1917' : '#FFFFFF',
      });
    } catch {
      return '';
    }
  }, [value, dark]);

  if (!svg) return null;

  return (
    <div
      className="vo-qr"
      style={{ width: size, height: size, background: dark ? '#1C1917' : '#fff', borderRadius: 12, padding: 8, boxSizing: 'border-box' }}
      role="img"
      aria-label="QR code"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.5
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
