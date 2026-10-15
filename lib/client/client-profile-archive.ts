import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { EMPTY_CLIENT_PROFILE, type ClientSavedProfile } from '@/lib/client/client-profile';
import { readJsonCollection, upsertJsonRecord } from '@/lib/db/json-collection';

const FILE = path.join(process.cwd(), 'data', 'client-profiles.json');
const COLLECTION = 'client_profiles';

type Store = Record<string, ClientSavedProfile>;
type StoredProfile = ClientSavedProfile & { id: string };

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

async function readFileStore(): Promise<Store> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeFileStore(store: Store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), 'utf8');
}

async function readMysqlStore(): Promise<Store> {
  const rows = await readJsonCollection<StoredProfile>(COLLECTION);
  const store: Store = {};
  for (const row of rows) {
    const key = keyFor(row.email || row.id);
    if (key) store[key] = row;
  }
  return store;
}

async function readStore(): Promise<Store> {
  const fileStore = await readFileStore();
  let mysqlStore: Store = {};
  try {
    mysqlStore = await readMysqlStore();
  } catch (err) {
    console.error('[client-profile] MySQL read failed:', err);
  }
  return { ...fileStore, ...mysqlStore };
}

export async function getClientSavedProfile(email: string): Promise<ClientSavedProfile | null> {
  const key = keyFor(email);
  if (!key) return null;
  const store = await readStore();
  return store[key] || null;
}

export async function saveClientSavedProfile(
  email: string,
  input: Partial<ClientSavedProfile>
): Promise<ClientSavedProfile> {
  const key = keyFor(email);
  const store = await readStore();
  const previous = store[key] || { ...EMPTY_CLIENT_PROFILE, email: key };
  const next: StoredProfile = {
    ...previous,
    displayName: String(input.displayName ?? previous.displayName ?? ''),
    phone: String(input.phone ?? previous.phone ?? ''),
    location: String(input.location ?? previous.location ?? ''),
    propertyType: String(input.propertyType ?? previous.propertyType ?? ''),
    bio: String(input.bio ?? previous.bio ?? ''),
    avatarUrl: String(input.avatarUrl ?? previous.avatarUrl ?? ''),
    coverUrl: String(input.coverUrl ?? previous.coverUrl ?? ''),
    gallery: Array.isArray(input.gallery) ? input.gallery.map(String).filter(Boolean) : previous.gallery || [],
    email: key,
    updatedAt: new Date().toISOString(),
    id: key,
  };

  let persisted = false;
  try {
    await upsertJsonRecord(COLLECTION, next);
    persisted = true;
  } catch (err) {
    console.error('[client-profile] MySQL write failed:', err);
  }
  try {
    store[key] = next;
    await writeFileStore(store);
    persisted = true;
  } catch (err) {
    console.warn('[client-profile] File write failed:', err);
  }
  if (!persisted) {
    throw new Error('Could not save profile.');
  }
  return next;
}
