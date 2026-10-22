'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProduct, updateOfferingSection } from '@/lib/api/offering-save';
import { isUsableImageUrl } from '@/lib/media/offering-image';
import OfferingImageUploader from '@/components/offerings/OfferingImageUploader';
import RichTextEditor from './RichTextEditor';
import { canCreateService } from '@/lib/catalog/offering-type';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import { getAllPrimaryCategories, type PrimaryCategory } from '@/lib/api/category.service';
import { generateSku } from '@/lib/utils/sku';

type TabId = 'GENERAL' | 'PRICING' | 'INVENTORY' | 'MEDIA' | 'SPECIFICATIONS' | 'SEO' | 'INTERNAL';

const TABS: TabId[] = ['GENERAL', 'PRICING', 'INVENTORY', 'MEDIA', 'SPECIFICATIONS', 'SEO', 'INTERNAL'];

const FALLBACK_CATEGORIES = ['FURNITURE', 'LIGHTING', 'DECOR', 'BEDDING', 'KITCHEN', 'STORAGE', 'OUTDOOR', 'RUGS', 'WALL_ART'];

const labelCls =
  'block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5';
const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300';
const cardCls = 'bg-[#F6F7F8] rounded-2xl p-6 space-y-5';
const noSpinner =
  ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

function NumberEntry({
  value,
  onChange,
  suffix,
  step = 1,
}: {
  value: number | string;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
}) {
  const numeric = Number(value) || 0;
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        className={`${inputCls} pr-12${noSpinner}`}
        value={value === 0 || value === '0' ? '' : String(value)}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, '');
          if (raw === '' || raw === '.') {
            onChange(0);
            return;
          }
          onChange(Number(raw));
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-9 top-2.5 text-sm text-gray-400">{suffix}</span>}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col">
        <button
          type="button"
          className="h-4 w-6 grid place-items-center text-[9px] text-gray-500 hover:text-gray-900"
          onClick={() => onChange(numeric + step)}
          aria-label="Increase"
        >
          ▲
        </button>
        <button
          type="button"
          className="h-4 w-6 grid place-items-center text-[9px] text-gray-500 hover:text-gray-900"
          onClick={() => onChange(Math.max(0, numeric - step))}
          aria-label="Decrease"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function CreateOfferingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const allowService = canCreateService(user);
  const [tab, setTab] = useState<TabId>('GENERAL');
  const [brands, setBrands] = useState<{ brand_id: number; brand_name: string }[]>([]);
  const [categories, setCategories] = useState<PrimaryCategory[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [prodId, setProdId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const submitInProgress = useRef(false);
  const tabIndex = TABS.indexOf(tab);

  const [form, setForm] = useState({
    offering_name: '',
    offering_type: 'PRODUCT',
    sku_id: '',
    category: '',
    brand_id: 5,
    brand: 'Hub Homes Royale',
    tags: ['chair', 'armchair', 'lounge', 'luxury', 'living-room'] as string[],
    short_desc: '',
    long_desc: '',
    featured_offer: false,
    cost_price: 0,
    selling_price: 0,
    discount: 0,
    gst_rate: 'GST_18',
    units: 'PER_PIECE',
    pricing_desc: '',
    track_inventory: true,
    barcode: '',
    current_stock: 0,
    minimum_stock_level: '',
    reorder_quantity: '',
    preferred_vendor: 'IN_HOUSE',
    lead_time: 7,
    primary_image: '',
    gallery_images: ['', '', '', ''] as string[],
    video_link: '',
    image_360: '',
    product_brochure: '',
    upload_draw: '',
    length_cm: 0,
    width_cm: 0,
    height_cm: 0,
    weight_kg: 0,
    primary_material: 'FABRIC',
    secondary_material: 'METAL',
    finish_type: 'BRUSHED',
    assembly_required: false,
    load_capacity: 'UP_TO_150_KG',
    care_instructions: '',
    additional_attributes: [{ attribute_name: '', value: '' }],
    page_title: '',
    meta_desc: '',
    url_slug: '',
    keywords: [] as string[],
    publishing_status: 'DRAFT',
    visibility: true,
    schedule_launch: '',
    allowed_users: ['admin@hubinterior.com', 'catalog@hubinterior.com'] as string[],
    restricted_region: '',
    sales_module: true,
    inventory_sync: true,
    procurement_pipeline: true,
    accounting_code: '',
    audit_notes: '',
  });

  useEffect(() => {
    fetch('/api/brands/dropdown')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.brands) && data.brands.length > 0) {
          setBrands(data.brands);
        }
      })
      .catch(() => undefined);
  }, []);

  // Fetch dynamic primary categories from catalog
  useEffect(() => {
    getAllPrimaryCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats);
          setForm((prev) => {
            if (prev.category) {
              const match = cats.find(
                (c) => c.primaryCategoryName?.toLowerCase() === prev.category?.toLowerCase()
              );
              if (match) {
                return { ...prev, category: match.primaryCategoryName };
              }
            }
            return prev;
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    fetch(`/api/products?id=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((product) => {
        if (!product?.offering_name && product?.prodId == null) return;
        setProdId(Number(product.prodId));
        setIsPublished(Boolean(product.is_published));
        setForm((prev) => ({
          ...prev,
          offering_name: product.offering_name || '',
          offering_type: product.offering_type || 'PRODUCT',
          sku_id: product.sku_id || '',
          category: product.category || 'FURNITURE',
          brand: product.brand || prev.brand,
          brand_id: product.brand_id || prev.brand_id,
          tags: Array.isArray(product.tags) ? product.tags : prev.tags,
          short_desc: product.short_desc || '',
          long_desc: product.long_desc || '',
          featured_offer: Boolean(product.featured_offer),
          cost_price: Number(product.pricing?.cost_price) || 0,
          selling_price: Number(product.pricing?.selling_price) || 0,
          discount: Number(product.pricing?.discount) || 0,
          gst_rate: product.pricing?.gst_rate || 'GST_18',
          units: product.pricing?.units || 'PER_PIECE',
          pricing_desc: product.pricing?.desc || '',
          current_stock: Number(product.inventory?.current_stock) || 0,
          barcode: product.inventory?.barcode || '',
          minimum_stock_level: String(product.inventory?.minimum_stock_level ?? ''),
          reorder_quantity: String(product.inventory?.reorder_quantity ?? ''),
          preferred_vendor: product.inventory?.sourcingLogistics?.preferred_vendor || 'IN_HOUSE',
          lead_time: Number(product.inventory?.sourcingLogistics?.lead_time) || 7,
          primary_image: isUsableImageUrl(product.media?.primary_image) ? product.media.primary_image : '',
          gallery_images: Array.isArray(product.media?.gallery_images) && product.media.gallery_images.length
            ? [...product.media.gallery_images, '', '', '', ''].slice(0, 4)
            : prev.gallery_images,
          video_link: product.media?.video_link || '',
          image_360: product.media?.image_360 || '',
          length_cm: Number(product.specifications?.physical_dimensions?.length) || 0,
          width_cm: Number(product.specifications?.physical_dimensions?.width) || 0,
          height_cm: Number(product.specifications?.physical_dimensions?.height) || 0,
          weight_kg: Number(product.specifications?.physical_dimensions?.weight) || 0,
          primary_material: product.specifications?.material_finish?.primary_material || prev.primary_material,
          secondary_material: product.specifications?.material_finish?.secondary_material || prev.secondary_material,
          finish_type: product.specifications?.material_finish?.finish_type || prev.finish_type,
          load_capacity: product.specifications?.technical_properties?.load_capacity || prev.load_capacity,
          page_title: product.seo?.page_title || '',
          meta_desc: product.seo?.meta_desc || '',
          url_slug: product.seo?.url_slug || '',
          keywords: Array.isArray(product.seo?.keywords) && product.seo.keywords.length ? product.seo.keywords : [],
          schedule_launch: product.internal?.visibility_status?.schedule_launch || '',
          restricted_region: product.internal?.access_permissions?.restricted_region || '',
          accounting_code: product.internal?.system_hooks_integration?.erp_module_integration?.accounting_code || '',
          audit_notes: product.internal?.audit_trail_notes?.desc || '',
          publishing_status: product.internal?.visibility_status?.publishing_status || 'DRAFT',
          allowed_users: product.internal?.access_permissions?.allowed_users || prev.allowed_users,
        }));
      })
      .catch(() => undefined);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem('shophub.createOffering.draft', JSON.stringify(form));
        setSavedAt(formatTime(new Date()));
      } catch {
        /* ignore quota */
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form]);

  const margin = useMemo(() => {
    if (!form.selling_price) return 0;
    return Math.max(0, ((form.selling_price - form.cost_price) / form.selling_price) * 100);
  }, [form.cost_price, form.selling_price]);

  const profit = useMemo(() => {
    const discounted = form.selling_price * (1 - Number(form.discount || 0) / 100);
    return discounted - form.cost_price;
  }, [form.cost_price, form.selling_price, form.discount]);

  const incomplete = useMemo(() => {
    const items: { tab: TabId; label: string }[] = [];
    if (!form.offering_name.trim()) items.push({ tab: 'GENERAL', label: 'Offering name' });
    if (!form.category.trim()) items.push({ tab: 'GENERAL', label: 'Category' });
    if (!form.sku_id.trim()) items.push({ tab: 'GENERAL', label: 'SKU' });
    if (!form.short_desc.trim()) items.push({ tab: 'GENERAL', label: 'Short description' });
    if (!form.long_desc.trim()) items.push({ tab: 'GENERAL', label: 'Long description' });
    if (!Number(form.selling_price)) items.push({ tab: 'PRICING', label: 'Selling price' });
    if (!Number(form.cost_price)) items.push({ tab: 'PRICING', label: 'Cost price' });
    if (!isUsableImageUrl(form.primary_image)) items.push({ tab: 'MEDIA', label: 'Primary image' });
    if (!Number(form.length_cm) && !Number(form.width_cm) && !Number(form.height_cm)) {
      items.push({ tab: 'SPECIFICATIONS', label: 'Dimensions' });
    }
    return items;
  }, [form]);

  const setField = (key: keyof typeof form, value: any) => {
    setForm((prev) => {
      return { ...prev, [key]: value };
    });
  };

  const persistMedia = async (primary: string, gallery: string[]) => {
    if (prodId == null) return;
    await updateOfferingSection({
      prodId,
      section: 'MEDIA',
      sku_id: form.sku_id,
      url_slug: form.url_slug || slugify(form.offering_name),
      payload: {
        primary_image: primary,
        gallery_images: gallery.filter((item) => isUsableImageUrl(item)),
        video_link: form.video_link,
      },
    });
    setSavedAt(formatTime(new Date()));
  };

  const addTag = () => {
    const next = tagInput.trim();
    if (!next || form.tags.includes(next)) return;
    setField('tags', [...form.tags, next]);
    setTagInput('');
  };

  const buildPayload = (publish: boolean) => {
    const selectedBrand = brands.find((b) => b.brand_id === Number(form.brand_id));
    const schedule = form.schedule_launch
      ? form.schedule_launch.length === 16
        ? `${form.schedule_launch}:00`
        : form.schedule_launch
      : null;

    return {
      offering_name: form.offering_name,
      offering_type: !allowService && form.offering_type === 'SERVICE' ? 'PRODUCT' : form.offering_type,
      sku_id: form.sku_id,
      category: form.category,
      brand: selectedBrand?.brand_name || form.brand,
      brand_id: Number(form.brand_id) || undefined,
      tags: form.tags,
      short_desc: form.short_desc,
      long_desc: form.long_desc,
      featured_offer: form.featured_offer,
      is_published: publish,
      pricing: {
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        discount: Number(form.discount) || 0,
        gst_rate: form.gst_rate,
        units: form.units,
        margin_percentage: Number(margin.toFixed(0)),
        desc: form.pricing_desc || undefined,
      },
      inventory: {
        sku_Id: form.sku_id,
        barcode: form.barcode,
        current_stock: Number(form.current_stock) || 0,
        minimum_stock_level: Number(form.minimum_stock_level) || 0,
        reorder_quantity: Number(form.reorder_quantity) || 0,
        sourcingLogistics: {
          preferred_vendor: form.preferred_vendor || 'IN_HOUSE',
          lead_time: Number(form.lead_time) || 0,
        },
      },
      media: {
        primary_image: form.primary_image,
        gallery_images: form.gallery_images.filter(Boolean),
        video_link: form.video_link,
        image_360: form.image_360,
        product_brochure: form.product_brochure,
        upload_draw: form.upload_draw,
      },
      specifications: {
        physical_dimensions: {
          length: Number(form.length_cm) || 0,
          width: Number(form.width_cm) || 0,
          height: Number(form.height_cm) || 0,
          weight: Number(form.weight_kg) || 0,
        },
        material_finish: {
          primary_material: form.primary_material,
          secondary_material: form.secondary_material,
          finish_type: form.finish_type,
        },
        technical_properties: {
          assembly_required: form.assembly_required,
          load_capacity: form.load_capacity,
          desc: form.care_instructions,
        },
        additional_attributes: form.additional_attributes.filter((a) => a.attribute_name && a.value),
      },
      seo: {
        page_title: form.page_title || form.offering_name,
        meta_desc: form.meta_desc || form.short_desc,
        url_slug: form.url_slug || slugify(form.offering_name),
        keywords: form.keywords,
      },
      internal: {
        visibility_status: {
          publishing_status: publish ? 'PUBLISHED' : 'DRAFT',
          visibility: form.visibility,
          schedule_launch: schedule,
        },
        access_permissions: {
          allowed_users: form.allowed_users,
          restricted_region: form.restricted_region || 'NONE',
        },
        system_hooks_integration: {
          erp_module_integration: {
            sales_module: form.sales_module,
            inventory_sync: form.inventory_sync,
            procurement_pipeline: form.procurement_pipeline,
            accounting_code: form.accounting_code,
          },
        },
        audit_trail_notes: {
          desc: form.audit_notes,
        },
      },
    };
  };

  const sectionPayload = (full: ReturnType<typeof buildPayload>) => {
    if (tab === 'PRICING') {
      return {
        cost_price: full.pricing.cost_price,
        selling_price: full.pricing.selling_price,
        discount: full.pricing.discount,
        gst_rate: full.pricing.gst_rate,
        units: full.pricing.units,
        desc: full.pricing.desc || '',
      };
    }
    if (tab === 'INVENTORY') return full.inventory;
    if (tab === 'MEDIA') {
      return {
        primary_image: full.media.primary_image,
        gallery_images: full.media.gallery_images,
        video_link: full.media.video_link,
      };
    }
    if (tab === 'SEO') return full.seo;
    if (tab === 'SPECIFICATIONS') {
      return {
        physical_dimensions: full.specifications.physical_dimensions,
        material_finish: full.specifications.material_finish,
      };
    }
    return full.internal;
  };

  const submit = async (publish: boolean) => {
    if (submitInProgress.current) return;
    if (!form.offering_name.trim() || !form.category.trim() || !form.sku_id.trim()) {
      setError('Offering name and Category are required before you can save.');
      setTab('GENERAL');
      return;
    }
    submitInProgress.current = true;
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const full = buildPayload(publish);
      const slotTabs = ['PRICING', 'INVENTORY', 'MEDIA', 'SEO', 'SPECIFICATIONS', 'INTERNAL'] as const;
      const updateSlot =
        prodId != null &&
        slotTabs.includes(tab as (typeof slotTabs)[number]) &&
        !(publish && !isPublished);

      if (updateSlot) {
        const slug = full.seo.url_slug || slugify(form.offering_name);
        const payload = sectionPayload(full);
        await updateOfferingSection({
          prodId,
          section: tab as (typeof slotTabs)[number],
          sku_id: form.sku_id,
          url_slug: slug,
          payload: tab === 'SEO' ? { ...payload, url_slug: slug } : payload,
        });
        setSuccess(`${tab.charAt(0)}${tab.slice(1).toLowerCase()} updated.`);
        return;
      }

      const data = await createProduct(full, prodId);
      const savedId = Number(data.prodId || prodId);
      if (savedId) {
        setProdId(savedId);
        router.replace(`/offerings/CreateOfferings?id=${savedId}`);
      }
      setIsPublished(publish || isPublished);
      const missing = incomplete.filter((item) => item.label !== 'Offering name' && item.label !== 'SKU');
      if (publish) {
        setSuccess(
          missing.length
            ? `Published. ${missing.length} field${missing.length === 1 ? '' : 's'} still need updates — fill them and click Update.`
            : 'This offering is live. You can keep editing and save updates anytime.'
        );
      } else {
        setSuccess('Draft saved. It will not appear in Master Catalog or Client Offerings until you publish.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save offering');
    } finally {
      submitInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (tabIndex < TABS.length - 1) setTab(TABS[tabIndex + 1]);
  };

  const goBack = () => {
    if (tabIndex > 0) setTab(TABS[tabIndex - 1]);
  };

  return (
    <div className="pb-28">
      <div className="w-full max-w-5xl px-10 pt-8 pb-2">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400 uppercase">
          Offerings <span className="mx-1.5 text-gray-300">›</span> {prodId ? 'Edit' : 'New Entry'}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-950">
          {prodId ? 'Update Offering' : 'Create Offering'}
        </h1>
      </div>

      <div className="sticky top-16 z-20 mt-6 border-b border-gray-200 bg-white">
        <div className="w-full max-w-5xl px-10 flex gap-1 overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`shrink-0 px-3 pt-3 pb-2.5 text-[11px] font-semibold tracking-[0.16em] ${
                tab === item
                  ? 'text-gray-950 border-b-2 border-black'
                  : 'text-gray-400 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {(success || error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => { setSuccess(null); setError(null); }}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`text-sm font-bold ${error ? 'text-red-700' : 'text-emerald-700'}`}>
              {error ? 'Could not save' : isPublished ? 'Offering published' : 'Draft saved'}
            </p>
            <p className="mt-2 text-sm text-gray-600">{error || success}</p>
            <button
              type="button"
              onClick={() => { setSuccess(null); setError(null); }}
              className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl px-10">
      <div className="mt-6 flex items-start gap-6">
      <div className="min-w-0 flex-1 space-y-5">
        {tab === 'GENERAL' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Basic Identification</h2>
                <p className="text-xs text-gray-500 mt-0.5">Primary details to identify this offering in the system.</p>
              </div>
              <div>
                <label className={labelCls}>Offering Name</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Premium Executive Desk"
                  value={form.offering_name}
                  onChange={(e) => setField('offering_name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Offering Type</label>
                  <select
                    className={inputCls}
                    value={!allowService && form.offering_type === 'SERVICE' ? 'PRODUCT' : form.offering_type}
                    onChange={(e) => setField('offering_type', e.target.value)}
                  >
                    <option value="PRODUCT">Product</option>
                    {allowService && <option value="SERVICE">Service</option>}
                    <option value="BUNDLE">Bundle</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>SKU / Identifier</label>
                  <div className="relative">
                    <input
                      readOnly
                      tabIndex={-1}
                      className={`${inputCls} bg-gray-100/80 font-mono text-gray-800 pr-28 cursor-not-allowed select-all focus:ring-0 focus:border-gray-200`}
                      placeholder="Select category to generate SKU"
                      value={form.sku_id}
                      title={form.sku_id ? "SKU is automatically generated and cannot be manually edited." : "Select a category below to generate the SKU."}
                    />
                    {form.sku_id ? (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded select-none flex items-center gap-1">
                        <span>🔒</span>
                        <span>Auto-generated</span>
                      </span>
                    ) : (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded select-none">
                        Pending category
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Classification</h2>
                <p className="text-xs text-gray-500 mt-0.5">Organize the offering for internal and external navigation.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        category: newCategory,
                        sku_id: prodId
                          ? prev.sku_id
                          : newCategory
                          ? generateSku({
                              category: newCategory,
                              offeringName: prev.offering_name,
                              brand: prev.brand,
                            })
                          : '',
                      }));
                    }}
                  >
                    <option value="">Select a Category...</option>
                    {categories.length > 0
                      ? categories.map((c) => {
                          const catName = c.primaryCategoryName || String(c);
                          return (
                            <option key={c.primaryCategoryId ?? catName} value={catName}>
                              {catName}
                            </option>
                          );
                        })
                      : FALLBACK_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.charAt(0) + c.slice(1).toLowerCase().replace('_', ' ')}
                          </option>
                        ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Brand</label>
                  {brands.length > 0 ? (
                    <select
                      className={inputCls}
                      value={form.brand_id}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const match = brands.find((b) => b.brand_id === id);
                        setForm((prev) => ({ ...prev, brand_id: id, brand: match?.brand_name || prev.brand }));
                      }}
                    >
                      {brands.map((b) => (
                        <option key={b.brand_id} value={b.brand_id}>
                          {b.brand_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className={inputCls} value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Tags</label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {form.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {tag}
                      <button type="button" onClick={() => setField('tags', form.tags.filter((t) => t !== tag))}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 min-w-[140px] border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Content & Narrative</h2>
                <p className="text-xs text-gray-500 mt-0.5">Detailed descriptions for the customer-facing catalog.</p>
              </div>
              <div>
                <label className={labelCls}>Short Description</label>
                <input
                  className={inputCls}
                  placeholder="Brief summary of the offering..."
                  value={form.short_desc}
                  onChange={(e) => setField('short_desc', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Long Description (Rich Text)</label>
                <RichTextEditor
                  value={form.long_desc}
                  onChange={(html) => setField('long_desc', html)}
                  placeholder="Detailed product narrative, features, and specifications..."
                />
              </div>
            </section>

            <section className={`${cardCls} flex items-center justify-between`}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Featured Offering</h2>
                <p className="text-xs text-gray-500 mt-0.5">Display this offering in the &quot;Recommended&quot; hero section of the storefront.</p>
              </div>
              <button
                type="button"
                onClick={() => setField('featured_offer', !form.featured_offer)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.featured_offer ? 'bg-black' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${form.featured_offer ? 'left-5.5' : 'left-0.5'}`} style={{ left: form.featured_offer ? '22px' : '2px' }} />
              </button>
            </section>
          </>
        )}

        {tab === 'PRICING' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Pricing Configuration</h2>
                <p className="text-xs text-gray-500 mt-0.5">Define the financial parameters for this offering.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Cost Price</label>
                  <NumberEntry value={form.cost_price} onChange={(value) => setField('cost_price', value)} />
                </div>
                <div>
                  <label className={labelCls}>Selling Price (MSRP)</label>
                  <NumberEntry value={form.selling_price} onChange={(value) => setField('selling_price', value)} />
                </div>
                <div>
                  <label className={labelCls}>Discount (%)</label>
                  <NumberEntry value={form.discount} suffix="%" onChange={(value) => setField('discount', value)} />
                </div>
                <div>
                  <label className={labelCls}>GST / Tax</label>
                  <select className={inputCls} value={form.gst_rate} onChange={(e) => setField('gst_rate', e.target.value)}>
                    <option value="GST_0">Exempt (0%)</option>
                    <option value="GST_5">GST 5%</option>
                    <option value="GST_12">GST 12%</option>
                    <option value="GST_18">GST 18%</option>
                    <option value="GST_28">GST 28%</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <select className={inputCls} value={form.units} onChange={(e) => setField('units', e.target.value)}>
                    <option value="PER_PIECE">Pcs</option>
                    <option value="PER_SET">Set</option>
                    <option value="PER_SQFT">Sqft</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Margin Percentage</label>
                  <input className={`${inputCls} bg-gray-100 text-gray-500`} readOnly value={margin.toFixed(0)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Pricing Description</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Standard inaugural festive pricing"
                    value={form.pricing_desc}
                    onChange={(e) => setField('pricing_desc', e.target.value)}
                  />
                </div>
              </div>
            </section>
            <section className={`${cardCls} flex items-center justify-between`}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Price Calculator</h2>
                <p className="text-xs text-gray-500 mt-0.5">Simulate pricing based on target margins.</p>
                <p className="mt-4 text-sm font-medium text-emerald-600">
                  Estimated Profit per Unit: ${profit.toFixed(2)}
                </p>
              </div>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                Open Calculator
              </button>
            </section>
          </>
        )}

        {tab === 'INVENTORY' && (
          <>
            <section className={cardCls}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Inventory Control</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage tracking and identification for this offering.</p>
                </div>
                <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Track Inventory
                  <button
                    type="button"
                    onClick={() => setField('track_inventory', !form.track_inventory)}
                    className={`relative h-6 w-11 rounded-full ${form.track_inventory ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white" style={{ left: form.track_inventory ? '22px' : '2px' }} />
                  </button>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>SKU / Identifier</label>
                  <input
                    readOnly
                    tabIndex={-1}
                    className={`${inputCls} bg-gray-100/80 font-mono text-gray-800 cursor-not-allowed select-all focus:ring-0 focus:border-gray-200`}
                    placeholder="Select category to generate SKU"
                    value={form.sku_id}
                    title={form.sku_id ? "SKU is automatically generated and cannot be manually edited." : "Select a category in General tab to generate the SKU."}
                  />
                </div>
                <div>
                  <label className={labelCls}>Barcode / EAN</label>
                  <input className={inputCls} placeholder="e.g. 501234567890" value={form.barcode} onChange={(e) => setField('barcode', e.target.value)} />
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Stock Parameters</h2>
                <p className="text-xs text-gray-500 mt-0.5">Define quantity thresholds and reorder points.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Current Stock</label>
                  <input type="number" className={inputCls} value={form.current_stock} onChange={(e) => setField('current_stock', Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>Minimum Stock Level</label>
                  <input className={inputCls} placeholder="Low stock alert" value={form.minimum_stock_level} onChange={(e) => setField('minimum_stock_level', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Reorder Quantity</label>
                  <input className={inputCls} placeholder="Default batch size" value={form.reorder_quantity} onChange={(e) => setField('reorder_quantity', e.target.value)} />
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sourcing & Logistics</h2>
                <p className="text-xs text-gray-500 mt-0.5">Vendor details and fulfillment locations.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Preferred Vendor</label>
                  <select className={inputCls} value={form.preferred_vendor} onChange={(e) => setField('preferred_vendor', e.target.value)}>
                    <option value="IN_HOUSE">IN_HOUSE</option>
                    <option value="VENDOR_A">VENDOR_A</option>
                    <option value="VENDOR_B">VENDOR_B</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Lead Time (Days)</label>
                  <input type="number" className={inputCls} value={form.lead_time} onChange={(e) => setField('lead_time', Number(e.target.value))} />
                </div>
              </div>
            </section>
          </>
        )}

        {tab === 'MEDIA' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Primary Image</h2>
                <p className="text-xs text-gray-500 mt-0.5">The main hero image used in search results and catalog listings.</p>
              </div>
              <OfferingImageUploader
                value={form.primary_image}
                onUploaded={async (url) => {
                  setField('primary_image', url);
                  await persistMedia(url, form.gallery_images);
                }}
              />
              <div>
                <label className={labelCls}>Primary Image URL</label>
                <input
                  className={inputCls}
                  placeholder="https://…"
                  value={form.primary_image}
                  onChange={(e) => setField('primary_image', e.target.value)}
                />
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Gallery Images</h2>
                <p className="text-xs text-gray-500 mt-0.5">Additional photos showing different angles and details.</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {form.gallery_images.map((img, idx) => (
                  <OfferingImageUploader
                    key={idx}
                    compact
                    value={img}
                    onUploaded={async (url) => {
                      const next = [...form.gallery_images];
                      next[idx] = url;
                      setField('gallery_images', next);
                      await persistMedia(form.primary_image, next);
                    }}
                  />
                ))}
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Videos & 360 View</h2>
                <p className="text-xs text-gray-500 mt-0.5">Interactive media to enhance customer engagement.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Video URL (Youtube / Vimeo)</label>
                  <input className={inputCls} placeholder="https://youtube.com/watch?v=..." value={form.video_link} onChange={(e) => setField('video_link', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>360 Interactive Image</label>
                  <input className={inputCls} placeholder="Upload 360 Assets" value={form.image_360} onChange={(e) => setField('image_360', e.target.value)} />
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Professional Assets</h2>
                <p className="text-xs text-gray-500 mt-0.5">Technical documentation and design files for enterprise clients.</p>
              </div>
              <input className={inputCls} placeholder="Product Brochure.pdf" value={form.product_brochure} onChange={(e) => setField('product_brochure', e.target.value)} />
              <input className={inputCls} placeholder="Upload CAD / 3D Models (.dwg, .obj, .step)" value={form.upload_draw} onChange={(e) => setField('upload_draw', e.target.value)} />
            </section>
          </>
        )}

        {tab === 'SPECIFICATIONS' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Physical Dimensions</h2>
                <p className="text-xs text-gray-500 mt-0.5">Specify the physical footprint and weight of the offering.</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ['length_cm', 'Length (cm)'],
                  ['width_cm', 'Width (cm)'],
                  ['height_cm', 'Height (cm)'],
                  ['weight_kg', 'Weight (kg)'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input type="number" className={inputCls} value={(form as any)[key]} onChange={(e) => setField(key as any, Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Material & Finish</h2>
                <p className="text-xs text-gray-500 mt-0.5">Define the composition and aesthetic treatment.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Primary Material</label>
                  <select className={inputCls} value={form.primary_material} onChange={(e) => setField('primary_material', e.target.value)}>
                    <option value="SOLID_WOOD">Solid Wood</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="METAL">Metal</option>
                    <option value="GLASS">Glass</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Secondary Material</label>
                  <select className={inputCls} value={form.secondary_material} onChange={(e) => setField('secondary_material', e.target.value)}>
                    <option value="NONE">None</option>
                    <option value="METAL">Metal</option>
                    <option value="FABRIC">Fabric</option>
                    <option value="SOLID_WOOD">Solid Wood</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Finish Type</label>
                  <select className={inputCls} value={form.finish_type} onChange={(e) => setField('finish_type', e.target.value)}>
                    <option value="BRUSHED">Brushed</option>
                    <option value="MATTE">Matte</option>
                    <option value="SATIN">Satin</option>
                    <option value="GLOSS">Gloss</option>
                  </select>
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Technical Properties</h2>
                <p className="text-xs text-gray-500 mt-0.5">Functional characteristics and maintenance requirements.</p>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 border border-gray-100">
                <div>
                  <p className={labelCls}>Assembly Required</p>
                  <p className="text-xs text-gray-500 -mt-1">Does this item require professional assembly?</p>
                </div>
                <button type="button" onClick={() => setField('assembly_required', !form.assembly_required)} className={`relative h-6 w-11 rounded-full ${form.assembly_required ? 'bg-black' : 'bg-gray-200'}`}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white" style={{ left: form.assembly_required ? '22px' : '2px' }} />
                </button>
              </div>
              <div>
                <label className={labelCls}>Load Capacity</label>
                <select className={inputCls} value={form.load_capacity} onChange={(e) => setField('load_capacity', e.target.value)}>
                  <option value="UP_TO_50_KG">Up to 50kg</option>
                  <option value="UP_TO_100_KG">Up to 100kg</option>
                  <option value="UP_TO_150_KG">Up to 150kg</option>
                  <option value="UP_TO_200_KG">Up to 200kg</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Care & Maintenance Instructions</label>
                <input className={inputCls} placeholder="e.g. Wipe with a damp cloth, avoid direct sunlight..." value={form.care_instructions} onChange={(e) => setField('care_instructions', e.target.value)} />
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Additional Attributes</h2>
                <p className="text-xs text-gray-500 mt-0.5">Add custom key-value pairs for specific requirements.</p>
              </div>
              {form.additional_attributes.map((attr, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3">
                  <input
                    className={inputCls}
                    placeholder="Attribute Name (e.g. Eco-friendly)"
                    value={attr.attribute_name}
                    onChange={(e) => {
                      const next = [...form.additional_attributes];
                      next[idx] = { ...next[idx], attribute_name: e.target.value };
                      setField('additional_attributes', next);
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Value (e.g. Yes)"
                    value={attr.value}
                    onChange={(e) => {
                      const next = [...form.additional_attributes];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setField('additional_attributes', next);
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-semibold tracking-wider text-gray-700"
                onClick={() => setField('additional_attributes', [...form.additional_attributes, { attribute_name: '', value: '' }])}
              >
                + Add Attribute
              </button>
            </section>
          </>
        )}

        {tab === 'SEO' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Search Engine Optimization</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure how this offering appears in search engine results.</p>
              </div>
              <div>
                <div className="flex justify-between">
                  <label className={labelCls}>Page Title (SEO Meta Title)</label>
                  <span className="text-[10px] text-gray-400">{form.page_title.length}/60</span>
                </div>
                <input className={inputCls} placeholder="Enter a descriptive title for search results" value={form.page_title} onChange={(e) => setField('page_title', e.target.value.slice(0, 60))} />
              </div>
              <div>
                <div className="flex justify-between">
                  <label className={labelCls}>Meta Description</label>
                  <span className="text-[10px] text-gray-400">{form.meta_desc.length}/160</span>
                </div>
                <textarea rows={3} className={inputCls} placeholder="Summarize the offering for search engine snippets..." value={form.meta_desc} onChange={(e) => setField('meta_desc', e.target.value.slice(0, 160))} />
              </div>
              <div>
                <label className={labelCls}>URL Slug</label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200">
                  <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">hubinterior.com/offerings/</span>
                  <input className="flex-1 px-3 text-sm outline-none" value={form.url_slug} onChange={(e) => setField('url_slug', slugify(e.target.value))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Keywords / Tags</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {form.keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                      {kw}
                      <button type="button" className="ml-1" onClick={() => setField('keywords', form.keywords.filter((k) => k !== kw))}>×</button>
                    </span>
                  ))}
                  <input
                    className="flex-1 min-w-[160px] border-0 text-sm outline-none"
                    placeholder="Add keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const next = keywordInput.trim();
                        if (next && !form.keywords.includes(next)) setField('keywords', [...form.keywords, next]);
                        setKeywordInput('');
                      }
                    }}
                  />
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <h2 className="text-sm font-semibold text-gray-900">Search Engine Preview</h2>
              <p className="text-xs text-gray-500">A simulation of how your offering might appear in Google search results.</p>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-400">hubinterior.com › offerings › {form.url_slug || '...'}</p>
                <p className="mt-1 text-lg text-[#1a0dab]">
                  {form.page_title || form.offering_name || 'Premium Executive Desk'} | HubInterior Offerings
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {form.meta_desc || form.short_desc || 'Discover the ultimate in office luxury with our Premium Executive Desk.'}
                </p>
              </div>
            </section>
          </>
        )}

        {tab === 'INTERNAL' && (
          <>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Visibility & Status</h2>
                <p className="text-xs text-gray-500 mt-0.5">Control how this offering is published and scheduled.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Publishing Status</label>
                  <select className={inputCls} value={form.publishing_status} onChange={(e) => setField('publishing_status', e.target.value)}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
                <div className="flex items-end justify-between rounded-lg border border-gray-200 bg-white px-4 py-2">
                  <div>
                    <p className={labelCls}>Visibility</p>
                    <p className="text-sm text-gray-800 -mt-1">Public on Storefront</p>
                  </div>
                  <button type="button" onClick={() => setField('visibility', !form.visibility)} className={`relative h-6 w-11 rounded-full ${form.visibility ? 'bg-black' : 'bg-gray-200'}`}>
                    <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white" style={{ left: form.visibility ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Schedule Launch</label>
                <input type="datetime-local" className={inputCls} value={form.schedule_launch} onChange={(e) => setField('schedule_launch', e.target.value)} />
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Access & Permissions</h2>
                <p className="text-xs text-gray-500 mt-0.5">Define which roles and regions can access this offering.</p>
              </div>
              <div>
                <label className={labelCls}>Allowed User Roles</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {form.allowed_users.map((user) => (
                    <span key={user} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs">
                      {user}
                      <button type="button" className="ml-1" onClick={() => setField('allowed_users', form.allowed_users.filter((r) => r !== user))}>×</button>
                    </span>
                  ))}
                  <input
                    className="flex-1 min-w-[120px] border-0 text-sm outline-none"
                    placeholder="Add email..."
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const next = roleInput.trim();
                        if (next && !form.allowed_users.includes(next)) setField('allowed_users', [...form.allowed_users, next]);
                        setRoleInput('');
                      }
                    }}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Restricted Regions</label>
                <input className={inputCls} placeholder="Select regions..." value={form.restricted_region} onChange={(e) => setField('restricted_region', e.target.value)} />
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">System Hooks & Integration</h2>
                <p className="text-xs text-gray-500 mt-0.5">Connect this offering to ERP modules and accounting.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-sm text-gray-800">
                  <p className={labelCls}>ERP Module Integration</p>
                  {[
                    ['sales_module', 'Sales Module'],
                    ['inventory_sync', 'Inventory Sync'],
                    ['procurement_pipeline', 'Procurement Pipeline'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input type="checkbox" checked={(form as any)[key]} onChange={(e) => setField(key as any, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div>
                  <label className={labelCls}>Accounting Code (GL Code)</label>
                  <input className={inputCls} placeholder="e.g. 4000-SALES-OFF" value={form.accounting_code} onChange={(e) => setField('accounting_code', e.target.value)} />
                </div>
              </div>
            </section>
            <section className={cardCls}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Audit Trail & Notes</h2>
                <p className="text-xs text-gray-500 mt-0.5">Internal documentation and record keeping.</p>
              </div>
              <textarea rows={4} className={inputCls} placeholder="System-level documentation..." value={form.audit_notes} onChange={(e) => setField('audit_notes', e.target.value)} />
              <p className="text-xs text-gray-400 text-right">Created by Alex Johnson, 22 Oct 2024</p>
            </section>
          </>
        )}
      </div>
      {prodId && incomplete.length > 0 && (
        <aside className="w-64 shrink-0 sticky top-36 rounded-2xl bg-[#F6F7F8] p-6">
          <h2 className="text-sm font-semibold text-gray-900">Not updated yet</h2>
          <p className="mt-0.5 text-xs text-gray-500">{incomplete.length} fields remaining</p>
          <div className="mt-4 space-y-2">
            {incomplete.map((item) => (
              <button
                key={`${item.tab}-${item.label}`}
                type="button"
                onClick={() => setTab(item.tab)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:border-gray-300"
              >
                <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-0.5">{item.tab}</span>
              </button>
            ))}
          </div>
        </aside>
      )}
      </div>
      </div>

      <div className="fixed bottom-0 right-0 left-56 z-20 border-t border-gray-200 bg-white">
      <div className="w-full max-w-5xl px-10 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={tabIndex === 0}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={tabIndex === TABS.length - 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 disabled:opacity-40"
          >
            Next
            <span>→</span>
          </button>
          <span className="hidden sm:inline text-[11px] text-gray-400">
            {tabIndex + 1} / {TABS.length} {tab}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <p className="hidden md:block text-xs text-emerald-600">Autosaved {savedAt}</p>}
          {!isPublished && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => submit(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Draft'}
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => submit(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting
              ? (user?.role === 'enterprise' ? 'Submitting for Approval...' : 'Saving...')
              : user?.role === 'enterprise'
              ? 'Submit for Approval'
              : isPublished
              ? 'Update'
              : 'Publish Offering'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
