export function isUsableImageUrl(url?: string | null): url is string {
  const value = String(url || '').trim();
  if (!value) return false;
  if (/example\.com/i.test(value)) return false;
  if (value === 'undefined' || value === 'null') return false;
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

export function offeringImageUrl(...candidates: Array<string | null | undefined>) {
  return candidates.find(isUsableImageUrl);
}
