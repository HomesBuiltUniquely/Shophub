import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { EMPTY_CLIENT_PROFILE, type ClientSavedProfile } from '@/lib/client/client-profile';

const FILE = path.join(process.cwd(), 'data', 'client-profiles.json');

type Store = Record<string, ClientSavedProfile>;

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), 'utf8');
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
  const next: ClientSavedProfile = {
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
  };
  store[key] = next;
  await writeStore(store);
  return next;
}
