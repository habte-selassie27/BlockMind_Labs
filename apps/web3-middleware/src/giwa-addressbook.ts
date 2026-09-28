/**
 * GIWA Address Book — memory + UP ID
 * Store name → up_id → address for GIWA-native contacts
 */

export interface Contact {
  name: string;
  up_id?: string;
  address: string;
  addedAt: number;
  verified?: boolean;
}

// per-wallet store: walletAddress -> contacts
const book = new Map<string, Map<string, Contact>>();

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

export function addContact(owner: string, contact: Omit<Contact, 'addedAt'>): Contact {
  const ownerKey = owner.toLowerCase();
  if (!book.has(ownerKey)) book.set(ownerKey, new Map());
  const c: Contact = { ...contact, name: normalize(contact.name), addedAt: Math.floor(Date.now() / 1000) };
  book.get(ownerKey)!.set(c.name, c);
  return c;
}

export function getContact(owner: string, name: string): Contact | null {
  const m = book.get(owner.toLowerCase());
  if (!m) return null;
  return m.get(normalize(name)) || null;
}

export function listContacts(owner: string): Contact[] {
  const m = book.get(owner.toLowerCase());
  if (!m) return [];
  return Array.from(m.values());
}

export function resolveContact(owner: string, nameOrUpId: string): { contact?: Contact; address?: string; up_id?: string } {
  const lower = normalize(nameOrUpId);
  // If it's already an address or UP ID, return directly
  if (lower.startsWith('0x') && lower.length === 42) return { address: lower };
  if (lower.includes('.up') || lower.includes('.giwa')) return { up_id: lower };
  // Lookup by name
  const c = getContact(owner, lower);
  if (c) return { contact: c, address: c.address, up_id: c.up_id };
  return {};
}

// Seed demo contacts
addContact('0x0000000000000000000000000000000000000000', { name: 'sarah', up_id: 'sarah.up', address: '0x3333333333333333333333333333333333333333', verified: true });
addContact('0x0000000000000000000000000000000000000000', { name: 'alice', up_id: 'alice.up', address: '0x1111111111111111111111111111111111111111', verified: true });

// ✅ COMPLIES WITH: AGENTS.md §9
// ✅ SERVICE: web3-middleware
