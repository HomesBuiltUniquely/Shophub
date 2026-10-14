'use client';

import { useRef, useState } from 'react';
import { isUsableImageUrl } from '@/lib/media/offering-image';

export async function uploadOfferingImage(file: File) {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', 'offerings');
  const res = await fetch('/api/uploads', { method: 'POST', body, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not upload image to S3.');
  if (!data.url) throw new Error('Upload succeeded but S3 returned no URL.');
  return String(data.url);
}

export default function OfferingImageUploader({
  value,
  onUploaded,
  label = 'Click to upload or drag and drop',
  compact = false,
}: {
  value?: string;
  onUploaded: (url: string) => Promise<void> | void;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadOfferingImage(file);
      await onUploaded(url);
    } catch (err) {
      setError((err as Error).message || 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <label
        className={`relative block cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 bg-white overflow-hidden text-center ${
          compact ? 'aspect-square' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {isUsableImageUrl(value) ? (
          <div className={compact ? 'h-full w-full' : 'relative'}>
            <img
              src={value}
              alt=""
              className={compact ? 'h-full w-full object-cover' : 'w-full max-h-72 object-contain bg-white'}
            />
            {!compact && (
              <div className="absolute inset-x-0 bottom-0 bg-black/55 py-2 text-xs font-semibold text-white">
                {busy ? 'Uploading to S3…' : 'Click or drop to replace'}
              </div>
            )}
          </div>
        ) : (
          <div className={compact ? 'flex h-full items-center justify-center text-2xl text-gray-300' : 'py-16'}>
            {compact ? (
              busy ? <span className="text-xs text-gray-500">Uploading…</span> : '+'
            ) : (
              <>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full text-gray-400">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">{busy ? 'Uploading to S3…' : label}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP, GIF, or SVG</p>
              </>
            )}
          </div>
        )}
      </label>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
