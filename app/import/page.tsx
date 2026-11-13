'use client';

import { useMemo, useRef, useState } from 'react';
import EnterpriseShell from '@/components/layout/EnterpriseShell';
import {
  IMPORT_FIELD_GROUPS,
  PRODUCT_IMPORT_FIELDS,
  PRODUCT_IMPORT_TEMPLATE_HEADERS,
  suggestColumnMapping,
  type ColumnMapping,
} from '@/lib/api/product-import-fields';

type ImportResult = {
  created: number;
  failed: number;
  message: string;
  errors?: { row: number; sku_id?: string; error: string }[];
};

function previewValue(row: Record<string, unknown> | undefined, header?: string) {
  if (!row || !header) return '';
  const value = row[header];
  if (value == null) return '';
  return String(value).trim();
}

const SAMPLE_VALUES: Record<string, string> = {
  offering_name: 'Walk-in Wardrobe',
  sku_id: 'SKU-WW-001',
  offering_type: 'PRODUCT',
  category: 'FURNITURE',
  brand: 'Hub Homes Royale',
  brand_id: '5',
  tags: 'wardrobe,luxury',
  short_desc: 'Custom walk-in closet',
  long_desc: 'Bespoke Italian wardrobe',
  featured_offer: 'false',
  is_published: 'true',
  selling_price: '125000',
  cost_price: '80000',
  discount: '0',
  gst_rate: 'GST_18',
  units: 'PER_PIECE',
  barcode: 'BAR-001',
  current_stock: '12',
  minimum_stock_level: '4',
  reorder_quantity: '8',
  preferred_vendor: 'IN_HOUSE',
  lead_time: '14',
  primary_image: 'https://example.com/wardrobe.jpg',
  length: '200',
  width: '180',
  height: '240',
  weight: '180',
  primary_material: 'SOLID_WOOD',
  finish_type: 'MATTE',
  page_title: 'Walk-in Wardrobes',
  meta_desc: 'Bespoke Italian wardrobes',
  url_slug: 'walk-in-wardrobes',
  keywords: 'wardrobe,closet',
};

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function templateCsv() {
  const headerLine = PRODUCT_IMPORT_TEMPLATE_HEADERS.join(',');
  const rowLine = PRODUCT_IMPORT_TEMPLATE_HEADERS.map((key) => csvCell(SAMPLE_VALUES[key] || '')).join(',');
  return `${headerLine}\n${rowLine}\n`;
}

function templateFile() {
  return new File([templateCsv()], 'product-import-template.csv', { type: 'text/csv;charset=utf-8;' });
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [loadedSheetUrl, setLoadedSheetUrl] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mappedRequired = Boolean(mapping.offering_name && mapping.sku_id);
  const mappedCount = PRODUCT_IMPORT_FIELDS.filter((field) => mapping[field.key]).length;

  const groupedFields = useMemo(
    () =>
      IMPORT_FIELD_GROUPS.map((group) => ({
        group,
        fields: PRODUCT_IMPORT_FIELDS.filter((field) => field.group === group),
      })),
    []
  );

  const acceptFile = async (next?: File) => {
    if (!next) return;
    const name = next.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setError('Upload an Excel (.xlsx) or CSV file.');
      return;
    }
    setIsParsing(true);
    setError(null);
    setResult(null);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await next.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('The spreadsheet has no sheets.');
      const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });
      const nextHeaders = (matrix[0] || []).map((cell) => String(cell).trim()).filter(Boolean);
      if (!nextHeaders.length) throw new Error('The first row must contain column headers.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      if (!rows.length) throw new Error('No data rows found in the file.');
      setFile(next);
      setLoadedSheetUrl('');
      setHeaders(nextHeaders);
      setPreviewRows(rows.slice(0, 3));
      setRowCount(rows.length);
      setMapping(suggestColumnMapping(nextHeaders));
    } catch (err: any) {
      setFile(null);
      setLoadedSheetUrl('');
      setHeaders([]);
      setPreviewRows([]);
      setRowCount(0);
      setMapping({});
      setError(err.message || 'Could not read that spreadsheet.');
    } finally {
      setIsParsing(false);
    }
  };

  const setFieldMapping = (fieldKey: string, header: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (!header) delete next[fieldKey];
      else next[fieldKey] = header;
      return next;
    });
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadGoogleSheet = async () => {
    const url = sheetUrl.trim();
    if (!url) {
      setError('Paste a Google Sheets link.');
      return;
    }
    setIsParsing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/products/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sheetUrl: url }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not load Google Sheet.');
      setFile(null);
      setLoadedSheetUrl(url);
      setHeaders(data.headers || []);
      setPreviewRows(data.previewRows || []);
      setRowCount(data.rowCount || 0);
      setMapping(suggestColumnMapping(data.headers || []));
    } catch (err: any) {
      setLoadedSheetUrl('');
      setHeaders([]);
      setPreviewRows([]);
      setRowCount(0);
      setMapping({});
      setError(err.message || 'Could not load Google Sheet.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!file && !loadedSheetUrl) {
      setError('Upload an Excel file or load a Google Sheet first.');
      return;
    }
    if (!mappedRequired) {
      setError('Map sheet columns to Offering name and SKU ID.');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      if (loadedSheetUrl) body.append('sheetUrl', loadedSheetUrl);
      else if (file) body.append('file', file);
      body.append('mapping', JSON.stringify(mapping));
      const res = await fetch('/api/products/import', { method: 'POST', body, credentials: 'include' });
      const data = await res.json();
      if (!res.ok && !data?.message) {
        throw new Error(data?.error || 'Import failed');
      }
      setResult(data);
      if (data.created === 0 && data.error) setError(data.error);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <EnterpriseShell title="Import" placeholder="Search catalog...">
      <main className="lg:ml-56 pt-16 p-4 sm:p-6 lg:p-8 max-w-5xl">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Import products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bulk-create offerings from Excel or a Google Sheet. Map columns to Create Product fields, then import.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Download template
          </button>
          <button
            type="button"
            onClick={() => acceptFile(templateFile())}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Preview sample mapping
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="hidden"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          className="mt-6 w-full rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center hover:border-gray-400"
        >
          <p className="text-sm font-semibold text-gray-900">
            {isParsing
              ? 'Reading spreadsheet…'
              : file
                ? file.name
                : loadedSheetUrl
                  ? 'Google Sheet loaded'
                  : 'Drop Excel here or click to upload'}
          </p>
          <p className="mt-1 text-xs text-gray-400">.xlsx, .xls, or .csv · first sheet · max 250 rows</p>
        </button>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <label className="block text-xs font-bold text-gray-900">Or paste a Google Sheets link</label>
          <p className="mt-1 text-[11px] text-gray-500">
            Share the sheet as Anyone with the link → Viewer. The first tab (or the gid in the URL) is imported.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={sheetUrl}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              onChange={(e) => setSheetUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  loadGoogleSheet();
                }
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              type="button"
              disabled={isParsing || !sheetUrl.trim()}
              onClick={loadGoogleSheet}
              className="shrink-0 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {isParsing ? 'Loading…' : 'Load sheet'}
            </button>
          </div>
        </div>

        {headers.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Map sheet columns to Create Product</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {rowCount} {rowCount === 1 ? 'row' : 'rows'} · {mappedCount} of {PRODUCT_IMPORT_FIELDS.length} fields mapped.
                  Offering name and SKU ID are required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapping(suggestColumnMapping(headers))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                Auto-match columns
              </button>
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Columns in this sheet</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {headers.map((header) => (
                <span key={header} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                  {header}
                </span>
              ))}
            </div>

            <div className="mt-5 space-y-6">
              {groupedFields.map(({ group, fields }) => (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{group}</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="w-[38%] px-3 py-2 font-semibold">Create Product field</th>
                          <th className="w-[32%] px-3 py-2 font-semibold">Sheet column</th>
                          <th className="px-3 py-2 font-semibold">Sample</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field) => {
                          const header = mapping[field.key] || '';
                          const sample = previewValue(previewRows[0], header);
                          return (
                            <tr key={field.key} className="border-t border-gray-100">
                              <td className="px-3 py-2 font-medium text-gray-800">
                                {field.label}
                                {field.required ? <span className="ml-1 text-red-500">*</span> : null}
                                <span className="ml-2 font-mono text-[10px] text-gray-400">{field.key}</span>
                              </td>
                              <td className="px-3 py-2">
                                <select
                                  value={header}
                                  onChange={(e) => setFieldMapping(field.key, e.target.value)}
                                  className={`w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-black ${
                                    field.required && !header ? 'border-red-300' : 'border-gray-200'
                                  }`}
                                >
                                  <option value="">Skip</option>
                                  {headers.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="max-w-[220px] truncate px-3 py-2 text-gray-500">{sample || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {previewRows.length > 1 && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Mapped preview</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        {PRODUCT_IMPORT_FIELDS.filter((field) => mapping[field.key]).slice(0, 8).map((field) => (
                          <th key={field.key} className="px-3 py-2">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-400">{index + 2}</td>
                          {PRODUCT_IMPORT_FIELDS.filter((field) => mapping[field.key])
                            .slice(0, 8)
                            .map((field) => (
                              <td key={field.key} className="max-w-[160px] truncate px-3 py-2 text-gray-700">
                                {previewValue(row, mapping[field.key]) || '—'}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          disabled={(!file && !loadedSheetUrl) || isUploading || isParsing || !mappedRequired}
          onClick={handleImport}
          className="mt-4 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isUploading ? 'Importing…' : 'Import products'}
        </button>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {result && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">{result.message}</p>
            <p className="mt-1 text-xs text-gray-500">
              Created {result.created} · Failed {result.failed}
            </p>
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-red-600">
                {result.errors.slice(0, 12).map((item) => (
                  <li key={`${item.row}-${item.sku_id || item.error}`}>
                    Row {item.row}
                    {item.sku_id ? ` (${item.sku_id})` : ''}: {item.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </EnterpriseShell>
  );
}
