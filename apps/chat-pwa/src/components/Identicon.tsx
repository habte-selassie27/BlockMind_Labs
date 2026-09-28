import { identiconGrid, identiconPalette } from '../lib/address';

interface Props {
  address: string;
  size?: number;
  className?: string;
}

/** Deterministic blocky identicon derived from an address (no external service). */
export default function Identicon({ address, size = 32, className }: Props) {
  const grid = identiconGrid(address);
  const palette = identiconPalette(address);
  const n = grid.length;
  const cell = 100 / n;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`Identicon for ${address.toLowerCase()}`}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
    >
      <rect width="100" height="100" rx="50" fill={palette.background} />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell + 0.4}
              height={cell + 0.4}
              fill={palette.colors[(x + y) % palette.colors.length]}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

// ✅ COMPLIES WITH: AGENTS.md §12.5 (pure client-side, no data transmitted)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
