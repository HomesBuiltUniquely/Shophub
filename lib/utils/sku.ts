/**
 * ==============================================================================
 * SKU (Stock Keeping Unit) Generator Utility
 * ==============================================================================
 * Pattern: Starts with "SKU-", followed by up to 3 alphabets and a number.
 * Format: SKU-{3_ALPHABETS}-{NUMBER}
 * e.g., SKU-FUR-101, SKU-LGT-204, SKU-SOF-315, SKU-CHR-482
 */

const CATEGORY_MAP: Record<string, string> = {
  FURNITURE: 'FUR',
  LIGHTING: 'LGT',
  DECOR: 'DEC',
  BEDDING: 'BED',
  KITCHEN: 'KIT',
  STORAGE: 'STR',
  OUTDOOR: 'OUT',
  RUGS: 'RUG',
  WALL_ART: 'ART',
  SERVICE: 'SRV',
  BUNDLE: 'BDL',
  GENERAL: 'GEN',
  'DINING-TABLE': 'DIN',
  'DINING_TABLE': 'DIN',
  'DINING TABLE': 'DIN',
  DINING: 'DIN',
  TABLE: 'TBL',
  CHAIR: 'CHR',
  SOFA: 'SOF',
  DESK: 'DSK',
  LIVING: 'LIV',
  'LIVING-ROOM': 'LIV',
  'LIVING ROOM': 'LIV',
  BEDROOM: 'BED',
  BATHROOM: 'BTH',
  OFFICE: 'OFC',
  SEATING: 'SEA',
  CABINET: 'CAB',
};

/**
 * Extracts up to 3 uppercase alphabets from text, dropping vowels if helpful.
 */
export function extractThreeAlphabets(text?: string, fallback = 'GEN'): string {
  if (!text || !text.trim()) return fallback.slice(0, 3).toUpperCase();

  const upper = text.trim().toUpperCase();
  if (CATEGORY_MAP[upper]) {
    return CATEGORY_MAP[upper];
  }

  // Check normalized version (replace hyphens/underscores/spaces)
  const normalized = upper.replace(/[-_\s]+/g, ' ');
  for (const [key, code] of Object.entries(CATEGORY_MAP)) {
    const normKey = key.replace(/[-_\s]+/g, ' ');
    if (normalized === normKey || normalized.includes(normKey)) {
      return code;
    }
  }

  // If multi-word (e.g. Dining Table), take first 3 letters of first word
  const words = upper.split(/[-_\s]+/).filter(Boolean);
  if (words.length > 0) {
    const firstWordLetters = words[0].replace(/[^A-Z]/g, '');
    if (firstWordLetters.length >= 3) {
      return firstWordLetters.slice(0, 3);
    }
  }

  // Strip non-letters
  const clean = upper.replace(/[^A-Z]/g, '');
  if (!clean) return fallback.slice(0, 3).toUpperCase();
  if (clean.length <= 3) return clean.padEnd(3, 'X');

  // Drop vowels after first letter to capture key consonants
  const first = clean[0];
  const noVowels = clean.slice(1).replace(/[AEIOU]/g, '');
  const candidate = (first + noVowels).slice(0, 3);

  return candidate.length === 3 ? candidate : clean.slice(0, 3);
}

/**
 * Generates a 3-digit random number that never starts with 0 (range: 100 to 999).
 */
export function generateNonZeroNumber(min = 100, max = 999): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export interface SkuOptions {
  category?: string;
  offeringName?: string;
  brand?: string;
  material?: string;
  number?: number | string;
  [key: string]: unknown;
}

/**
 * Generates an SKU starting with "SKU-", up to 3 alphabets, and a number.
 * e.g. SKU-FUR-101, SKU-LGT-204, SKU-SOF-315
 */
export function generateSku(
  nameOrOptions?: string | SkuOptions,
  category?: string,
  _brand?: string,
  _attribute?: string
): string {
  let cat = '';
  let name = '';
  let num: number | string | undefined;

  if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
    cat = nameOrOptions.category || '';
    name = nameOrOptions.offeringName || '';
    num = nameOrOptions.number;
  } else {
    name = nameOrOptions || '';
    cat = category || '';
  }

  // Determine the 3 alphabets (category first, then name fallback)
  const alphabets = extractThreeAlphabets(cat || name || 'GEN');

  // Determine the number (never starting with zero)
  const numberPart = num !== undefined ? String(num) : String(generateNonZeroNumber(100, 999));

  return `SKU-${alphabets}-${numberPart}`;
}
