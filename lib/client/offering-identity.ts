export type OfferingIdentity = {
  email?: string | null;
  phone?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  extra?: Array<string | number | null | undefined>;
};

function addKey(keys: Set<string>, raw?: string | number | null) {
  const v = String(raw ?? '').trim();
  if (!v) return;
  const lower = v.toLowerCase();
  keys.add(lower);
  const noPrefix = lower.replace(/^blr-?/i, '');
  if (noPrefix && noPrefix !== lower) keys.add(noPrefix);
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 4) keys.add(digits);
  if (digits.length >= 10) keys.add(digits.slice(-10));
}

export function offeringIdentityKeys(input: OfferingIdentity): string[] {
  const keys = new Set<string>();
  addKey(keys, input.email?.trim().toLowerCase());
  addKey(keys, input.phone);
  addKey(keys, input.leadId);
  addKey(keys, input.clientId);
  for (const extra of input.extra || []) addKey(keys, extra);
  return [...keys];
}

export function identitiesOverlap(a: OfferingIdentity, b: OfferingIdentity): boolean {
  const left = new Set(offeringIdentityKeys(a));
  if (!left.size) return false;
  return offeringIdentityKeys(b).some((key) => left.has(key));
}

export function hasIdentity(input: OfferingIdentity) {
  return offeringIdentityKeys(input).length > 0;
}
