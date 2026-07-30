/**
 * Antrean review tahan-tutup-tab.
 *
 * Setiap grade langsung ditulis ke IndexedDB sebelum kartu berganti, jadi
 * menutup tab di tengah sesi tidak menghilangkan progres: sesi berikutnya
 * mem-flush sisa antrean ke server. Ini memperbaiki cacat Nihongo Flow yang
 * menyimpan `pendingReviews` hanya di memori.
 *
 * Berjalan hanya di browser; kalau IndexedDB tidak tersedia semua fungsi
 * menjadi no-op dan pemanggil jatuh ke pengiriman langsung.
 */
import type { ReviewSubmission } from "@/features/anki/types";

const DB_NAME = "hibi";
const STORE = "pending_reviews";
const VERSION = 1;

function hasIndexedDb(): boolean {
  return typeof globalThis !== "undefined" && "indexedDB" in globalThis;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

export async function enqueueReview(sub: ReviewSubmission): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(sub);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export type DrainedReviews = {
  keys: IDBValidKey[];
  subs: ReviewSubmission[];
};

/** Baca semua submission tertunda beserta key-nya (tanpa menghapus). */
export async function drainReviews(): Promise<DrainedReviews> {
  const db = await openDb();
  if (!db) return { keys: [], subs: [] };
  const result = await new Promise<DrainedReviews>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keys: IDBValidKey[] = [];
    const subs: ReviewSubmission[] = [];
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        keys.push(cursor.key);
        subs.push(cursor.value as ReviewSubmission);
        cursor.continue();
      } else {
        resolve({ keys, subs });
      }
    };
    cursorReq.onerror = () => resolve({ keys, subs });
  });
  db.close();
  return result;
}

/** Hapus submission yang sudah berhasil dikirim, tepat pada key yang di-drain. */
export async function removeReviews(keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const key of keys) store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}
