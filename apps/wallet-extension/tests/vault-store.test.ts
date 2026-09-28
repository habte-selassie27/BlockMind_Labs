import { describe, expect, it } from 'vitest';
import { VaultDecryptError } from '../src/vault/crypto';
import { KEYS } from '../src/runtime/vault-store';
import type { VaultRecord } from '../src/vault/types';
import { HARDHAT_ACCOUNT_0, HARDHAT_ACCOUNT_1, HARDHAT_MNEMONIC, TEST_PASSWORD, createTestVault } from './helpers';

describe('vault lifecycle', () => {
  it('reports no wallet before creation', async () => {
    const status = await createTestVault().store.status();
    expect(status.exists).toBe(false);
    expect(status.locked).toBe(false);
    expect(status.address).toBeNull();
  });

  it('creates an unlocked vault with one account', async () => {
    const { store } = createTestVault();
    const status = await store.create(TEST_PASSWORD);
    expect(status.exists).toBe(true);
    expect(status.locked).toBe(false);
    expect(status.accounts).toHaveLength(1);
    expect(status.accounts[0]?.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('imports a known phrase and derives its first address', async () => {
    const { store } = createTestVault();
    const status = await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    expect(status.address).toBe(HARDHAT_ACCOUNT_0);
  });

  it('never persists the secret in plaintext', async () => {
    const { store, local } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    const record = await local.get<VaultRecord>(KEYS.vault);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain('junk');
    expect(serialized).not.toContain(TEST_PASSWORD);
    expect(record?.sealed.ciphertext.length).toBeGreaterThan(0);
    // The address is public and deliberately stored unsealed for instant display.
    expect(record?.address).toBe(HARDHAT_ACCOUNT_0);
  });

  it('locks and requires the correct password to unlock', async () => {
    const { store } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await store.lock();

    expect((await store.status()).locked).toBe(true);
    await expect(store.unlock('wrong password')).rejects.toBeInstanceOf(VaultDecryptError);
    await expect(store.unlock(TEST_PASSWORD)).resolves.toMatchObject({ locked: false });
  });

  it('refuses to sign once locked', async () => {
    const { store } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await store.lock();
    await expect(store.requireUnlocked()).rejects.toThrow(/locked/i);
  });

  it('auto-locks after the configured idle window', async () => {
    const vault = createTestVault();
    await vault.store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await vault.store.updateSettings({ autoLockMinutes: 15 });

    vault.advance(14 * 60_000);
    await expect(vault.store.secretIfUnlocked()).resolves.toBeTruthy();

    vault.advance(2 * 60_000);
    await expect(vault.store.secretIfUnlocked()).resolves.toBeUndefined();
    expect((await vault.store.status()).locked).toBe(true);
  });

  it('extends the session while the user is active', async () => {
    const vault = createTestVault();
    await vault.store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await vault.store.updateSettings({ autoLockMinutes: 15 });

    vault.advance(14 * 60_000);
    await vault.store.touch();
    vault.advance(5 * 60_000);
    await expect(vault.store.secretIfUnlocked()).resolves.toBeTruthy();
  });

  it('requires the password again to export keys', async () => {
    const { store } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await expect(store.reveal('wrong password')).rejects.toBeInstanceOf(VaultDecryptError);
    await expect(store.reveal(TEST_PASSWORD)).resolves.toMatchObject({ mnemonic: HARDHAT_MNEMONIC });
  });
});

describe('accounts', () => {
  it('derives additional accounts on demand and selects them', async () => {
    const { store } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);

    const afterAdd = await store.addAccount();
    expect(afterAdd.accounts).toHaveLength(2);
    expect(afterAdd.accounts[1]?.address).toBe(HARDHAT_ACCOUNT_1);
    expect(afterAdd.selectedIndex).toBe(1);

    const reselected = await store.selectAccount(0);
    expect(reselected.selectedIndex).toBe(0);
  });

  it('rejects selecting an account that does not exist', async () => {
    const { store } = createTestVault();
    await store.importMnemonic(TEST_PASSWORD, HARDHAT_MNEMONIC);
    await expect(store.selectAccount(7)).rejects.toThrow(/does not exist/);
  });

  it('cannot add accounts to a single-key vault', async () => {
    const { store } = createTestVault();
    await store.importPrivateKey(TEST_PASSWORD, `0x${'01'.repeat(32)}`);
    await expect(store.addAccount()).rejects.toThrow(/cannot derive additional accounts/);
  });
});

describe('trusted contracts (§12.4)', () => {
  it('records trusted addresses case-insensitively', async () => {
    const { store } = createTestVault();
    const token = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    expect(await store.isTrusted(token)).toBe(false);
    await store.trust(token);
    expect(await store.isTrusted(token.toLowerCase())).toBe(true);

    await store.trust(token);
    expect(await store.trustedAddresses()).toHaveLength(1);
  });
});

describe('origin connections', () => {
  it('tracks which origins may see accounts', async () => {
    const { store } = createTestVault();
    expect(await store.isConnected('https://app.giwa.io')).toBe(false);
    await store.setConnected('https://app.giwa.io');
    expect(await store.isConnected('https://app.giwa.io')).toBe(true);
    await store.disconnectOrigin('https://app.giwa.io');
    expect(await store.isConnected('https://app.giwa.io')).toBe(false);
  });
});

describe('pending requests and results', () => {
  it('stores, reads, and clears a pending request', async () => {
    const { store } = createTestVault();
    await store.setPending({ id: 'req-1', kind: 'transaction' });
    await expect(store.getPending('req-1')).resolves.toEqual({ id: 'req-1', kind: 'transaction' });

    await store.clearPending('req-1');
    await expect(store.getPending('req-1')).resolves.toBeUndefined();
  });

  it('stores results so a restarted worker can still answer the caller', async () => {
    const { store } = createTestVault();
    await store.setResult('req-1', { createdAt: 1, response: { id: 'req-1', result: '0xhash' } });
    await expect(store.getResult('req-1')).resolves.toMatchObject({ response: { result: '0xhash' } });
  });
});
