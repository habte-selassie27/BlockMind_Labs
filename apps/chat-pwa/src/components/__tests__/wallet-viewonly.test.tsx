import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WalletProvider, useWallet } from '../../wallet';

const OWNER = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const OWNER_CHECKSUM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

const wrapper = ({ children }: { children: ReactNode }) => <WalletProvider>{children}</WalletProvider>;

/** Renders the wallet hook and flushes mount-triggered balance refreshes inside act(). */
async function renderWalletHook() {
  const rendered = renderHook(() => useWallet(), { wrapper });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return rendered;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ result: '0x0' }) })),
  );
});

afterEach(async () => {
  // Flush the provider's 100ms refreshBalance timer inside act() to avoid
  // "not wrapped in act(...)" noise, then unmount.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 150));
  });
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllTimers();
});

describe('view-only signing guard', () => {
  it('blocks signAndSend for a manual (view-only) connection', async () => {
    const { result } = await renderWalletHook();

    await act(async () => {
      await result.current.connect('manual', OWNER);
    });

    expect(result.current.isViewOnly).toBe(true);
    await expect(
      result.current.signAndSend({ to: OWNER, value: '0x0' }),
    ).rejects.toThrow(/View-only session/);
  });

  it('blocks signAndSend when a view-only session is restored after reload', async () => {
    localStorage.setItem(
      'blockmind_view_session',
      JSON.stringify({ address: OWNER, chainId: 91342, savedAt: Date.now() }),
    );

    const { result } = await renderWalletHook();

    expect(result.current.isViewOnly).toBe(true);
    expect(result.current.address).toBe(OWNER_CHECKSUM);
    await expect(
      result.current.signAndSend({ to: OWNER, value: '0x0' }),
    ).rejects.toThrow(/View-only session/);
  });

  it('does not blanket-block once disconnected (fails on missing provider instead)', async () => {
    const { result } = await renderWalletHook();

    await act(async () => {
      await result.current.connect('manual', OWNER);
    });
    await act(async () => {
      result.current.disconnect();
    });

    expect(result.current.isViewOnly).toBe(false);
    expect(localStorage.getItem('blockmind_view_session')).toBeNull();
    await expect(
      result.current.signAndSend({ to: OWNER, value: '0x0' }),
    ).rejects.toThrow(/Connect MetaMask or Blockmind Wallet/);
  });

  it('upgrades a view-only session to a real wallet connection', async () => {
    const { result } = await renderWalletHook();

    await act(async () => {
      await result.current.connect('manual', OWNER);
    });
    expect(result.current.isViewOnly).toBe(true);

    const fakeProvider = {
      request: vi.fn(async (args: { method: string }) => {
        if (args.method === 'eth_requestAccounts') return [OWNER];
        if (args.method === 'eth_chainId') return '0x164ce'; // 91342
        return null;
      }),
      on: vi.fn(),
      removeListener: vi.fn(),
    };
    (window as unknown as { ethereum?: unknown }).ethereum = fakeProvider;

    await act(async () => {
      await result.current.connect('metamask');
    });

    expect(result.current.isViewOnly).toBe(false);
    expect(result.current.address).toBe(OWNER);
    expect(localStorage.getItem('blockmind_view_session')).toBeNull();

    delete (window as unknown as { ethereum?: unknown }).ethereum;
  });
});

// ✅ COMPLIES WITH: AGENTS.md §12.2, §12.5 (view-only never reaches a signer)
// ✅ SERVICE: chat-pwa
// ✅ ARCHITECT SPEC: View-Only Address upgrade
