import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import Identicon from '../Identicon';
import CopyButton from '../CopyButton';
import QRCode from '../QRCode';
import AddressField from '../AddressField';
import { buildWatchLink } from '../../lib/watchlist';

const A = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

afterEach(() => cleanup());

describe('Identicon', () => {
  it('renders deterministic SVG markup for the same address', () => {
    const a = renderToStaticMarkup(<Identicon address={A} size={32} />);
    const b = renderToStaticMarkup(<Identicon address={A.toLowerCase()} size={32} />);
    expect(a).toBe(b);
    expect(a).toContain('<svg');
    expect(a).toContain('32');
  });

  it('differs across addresses', () => {
    const a = renderToStaticMarkup(<Identicon address={A} />);
    const b = renderToStaticMarkup(<Identicon address="0x1111111111111111111111111111111111111111" />);
    expect(a).not.toBe(b);
  });
});

describe('CopyButton', () => {
  it('copies the value and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyButton value={A} label="Copy address" />);
    fireEvent.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith(A);
    expect(await screen.findByText('Copied')).toBeTruthy();
  });
});

describe('QRCode', () => {
  it('encodes a watch link as SVG', () => {
    const svg = renderToStaticMarkup(<QRCode value={buildWatchLink(A, 'https://blockmind.xyz')} size={140} />);
    expect(svg).toContain('<svg');
    expect(svg).toContain('rect');
  });

  it('does not render anything for empty input', () => {
    const svg = renderToStaticMarkup(<QRCode value="" />);
    expect(svg).not.toContain('<svg');
  });
});

describe('AddressField', () => {
  it('emits a checksummed address immediately for 0x input', () => {
    const onResolved = vi.fn();
    render(
      <AddressField value={A.toLowerCase()} onChange={() => {}} onResolved={onResolved} />,
    );
    expect(onResolved).toHaveBeenCalledWith({ address: A, ens: null, error: null });
    expect(screen.getByTitle(A)).toBeTruthy();
  });

  it('flags invalid input without resolving', () => {
    const onResolved = vi.fn();
    render(<AddressField value="definitely not an address" onChange={() => {}} onResolved={onResolved} />);
    expect(onResolved).toHaveBeenCalledWith({ address: null, ens: null, error: expect.any(String) });
    expect(screen.getByText(/0x address or an ENS name/i)).toBeTruthy();
  });

  it('renders recent-address chips', () => {
    render(
      <AddressField value="" onChange={() => {}} onResolved={() => {}} recents={[A]} onPick={() => {}} />,
    );
    expect(screen.getByTitle(A)).toBeTruthy();
  });
});

// ✅ COMPLIES WITH: AGENTS.md §11 (no invented schemas)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
