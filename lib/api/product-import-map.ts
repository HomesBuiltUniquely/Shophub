import type { CreateProductPayload } from './offering-save';
import {
  PRODUCT_IMPORT_FIELDS,
  normKey,
  type ColumnMapping,
  type ImportField,
} from './product-import-fields';

export type { ColumnMapping, ImportField, ImportFieldGroup } from './product-import-fields';
export {
  IMPORT_FIELD_GROUPS,
  PRODUCT_IMPORT_FIELDS,
  PRODUCT_IMPORT_TEMPLATE_HEADERS,
  suggestColumnMapping,
  normKey,
} from './product-import-fields';

export function parseColumnMapping(raw: unknown): ColumnMapping | undefined {
  if (raw == null || raw === '') return undefined;
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const mapping: ColumnMapping = {};
  for (const [key, header] of Object.entries(value as Record<string, unknown>)) {
    if (typeof header === 'string' && header.trim()) mapping[key] = header.trim();
  }
  return mapping;
}

function pick(row: Record<string, unknown>, aliases: string[]) {
  const map: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    map[normKey(key)] = value;
  }
  for (const alias of aliases) {
    const value = map[normKey(alias)];
    if (value != null && String(value).trim() !== '') return value;
  }
  return '';
}

function valueForField(row: Record<string, unknown>, field: ImportField, mapping?: ColumnMapping) {
  if (mapping) {
    const header = mapping[field.key];
    if (!header) return '';
    if (Object.prototype.hasOwnProperty.call(row, header)) return row[header];
    const target = normKey(header);
    for (const [key, value] of Object.entries(row)) {
      if (normKey(key) === target) return value;
    }
    return '';
  }
  return pick(row, [field.key, ...field.aliases]);
}

function asString(value: unknown) {
  return String(value ?? '').trim();
}

function asNumber(value: unknown) {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function asBool(value: unknown) {
  const text = asString(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'published', 'active'].includes(text);
}

function asList(value: unknown) {
  if (Array.isArray(value)) return value.map(asString).filter(Boolean);
  return asString(value)
    .split(/[,|;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function excelRowToProduct(row: Record<string, unknown>, mapping?: ColumnMapping): CreateProductPayload | null {
  const field = (key: string) => {
    const def = PRODUCT_IMPORT_FIELDS.find((item) => item.key === key);
    return valueForField(row, def || { key, label: key, group: 'General', aliases: [] }, mapping);
  };

  const offering_name = asString(field('offering_name'));
  const sku_id = asString(field('sku_id')).toUpperCase();
  if (!offering_name || !sku_id) return null;

  const category = asString(field('category')).toUpperCase() || 'FURNITURE';
  const brand = asString(field('brand'));
  const brandIdRaw = field('brand_id');
  const tags = asList(field('tags'));
  const keywords = asList(field('keywords')).length ? asList(field('keywords')) : tags;
  const short_desc = asString(field('short_desc')) || offering_name;
  const long_desc = asString(field('long_desc')) || short_desc;
  const selling_price = asNumber(field('selling_price'));
  const cost_price = asNumber(field('cost_price'));
  const discount = asNumber(field('discount'));
  const current_stock = asNumber(field('current_stock'));
  const publishedRaw = asString(field('is_published'));
  const is_published = publishedRaw === '' ? true : asBool(publishedRaw);

  return {
    offering_name,
    offering_type: asString(field('offering_type')) || 'PRODUCT',
    sku_id,
    category,
    brand,
    brand_id: brandIdRaw === '' ? undefined : asNumber(brandIdRaw) || undefined,
    tags,
    short_desc,
    long_desc,
    featured_offer: asBool(field('featured_offer')),
    is_published,
    pricing: {
      cost_price,
      selling_price,
      discount,
      gst_rate: asString(field('gst_rate')) || 'GST_18',
      units: asString(field('units')) || 'PER_PIECE',
      desc: asString(field('pricing_desc')) || undefined,
    },
    inventory: {
      sku_Id: sku_id,
      barcode: asString(field('barcode')),
      current_stock,
      minimum_stock_level: asNumber(field('minimum_stock_level')),
      reorder_quantity: asNumber(field('reorder_quantity')),
      sourcingLogistics: {
        preferred_vendor: asString(field('preferred_vendor')) || 'IN_HOUSE',
        lead_time: asNumber(field('lead_time')),
      },
    },
    media: {
      primary_image: asString(field('primary_image')),
      gallery_images: asList(field('gallery_images')),
      video_link: asString(field('video_link')),
      image_360: asString(field('image_360')),
    },
    specifications: {
      physical_dimensions: {
        length: asNumber(field('length')),
        width: asNumber(field('width')),
        height: asNumber(field('height')),
        weight: asNumber(field('weight')),
      },
      material_finish: {
        primary_material: asString(field('primary_material')) || 'SOLID_WOOD',
        secondary_material: asString(field('secondary_material')),
        finish_type: asString(field('finish_type')) || 'MATTE',
      },
      technical_properties: {
        load_capacity: asString(field('load_capacity')) || 'UP_TO_200_KG',
        desc: asString(field('care_instructions')),
      },
    },
    seo: {
      page_title: asString(field('page_title')) || offering_name,
      meta_desc: asString(field('meta_desc')) || short_desc,
      url_slug: asString(field('url_slug')) || slugify(offering_name),
      keywords,
    },
    internal: {
      visibility_status: {
        publishing_status: is_published ? 'PUBLISHED' : 'DRAFT',
        visibility: true,
      },
    },
  };
}
