/**
 * Uploaded creator media stays on this device: blobs are kept in IndexedDB (never uploaded anywhere),
 * so imports survive a page refresh. Sample media are static files under /media/yakiniku.
 */
import { useEffect, useState } from 'react';
import type { MediaAsset } from './state';

const DB = 'reel-agent-media';
const STORE = 'blobs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const putBlob = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)).catch(() => undefined);
export const getBlob = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id)).catch(() => undefined);
export const deleteBlob = (id: string) => tx('readwrite', (s) => s.delete(id)).catch(() => undefined);
export const clearBlobs = () => tx('readwrite', (s) => s.clear()).catch(() => undefined);

const cache = new Map<string, string>();

/** Resolves a playable URL for every asset (object URL for uploads). Missing uploads map to null. */
export function useAssetUrls(assets: MediaAsset[]) {
  const [urls, setUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(assets.map((a) => [a.id, a.source === 'sample' ? a.url ?? null : cache.get(a.id) ?? null])),
  );
  const key = assets.map((a) => a.id).join('|');
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string | null> = {};
      for (const a of assets) {
        if (a.source === 'sample') out[a.id] = a.url ?? null;
        else if (cache.has(a.id)) out[a.id] = cache.get(a.id)!;
        else {
          const b = await getBlob(a.id);
          if (b) {
            const u = URL.createObjectURL(b);
            cache.set(a.id, u);
            out[a.id] = u;
          } else out[a.id] = null;
        }
      }
      if (alive) setUrls(out);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

/** Reads a file's kind and (for video) duration before it's added to the project. */
export async function describeFile(file: File): Promise<{ kind: 'image' | 'video'; duration?: number } | null> {
  if (file.type.startsWith('image/')) return { kind: 'image' };
  if (!file.type.startsWith('video/')) return null;
  const url = URL.createObjectURL(file);
  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.onloadedmetadata = () => resolve(v.duration);
      v.onerror = () => reject(new Error('unplayable'));
      v.src = url;
    });
    return { kind: 'video', duration: Number.isFinite(duration) ? duration : undefined };
  } catch {
    return null; // e.g. a codec this browser can't decode
  } finally {
    URL.revokeObjectURL(url);
  }
}
