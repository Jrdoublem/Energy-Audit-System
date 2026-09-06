// Firebase Storage has no offline write queue of its own (unlike Firestore,
// which is configured with persistentLocalCache in firebase.js) — an upload
// attempted with no signal just fails outright. This module fills that gap
// for equipment photos specifically: while offline, the resized image is
// kept in IndexedDB and shown from that local copy immediately; once the
// connection returns, it's uploaded for real and the target Firestore
// document is patched with the resulting Storage URL.
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase.js';
import { uploadImage } from './storageStore.js';

const DB_NAME = 'enginspect-offline-queue';
const STORE_NAME = 'pending-images';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE_NAME)) {
        idb.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const idb = await openDb();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Firebase Storage doesn't fail fast when there's no signal the way
// Firestore does — an upload attempt can sit for a long time before the
// underlying request finally errors out. Racing it against a short timeout
// is what makes "attach a photo while offline" fall back to the local queue
// quickly instead of leaving the UI stuck on "uploading...".
const UPLOAD_TIMEOUT_MS = 8000;
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('upload timed out')), ms)),
  ]);
}

// targetCollection/targetDocId/targetField describe where the real Storage
// URL gets patched in once the upload succeeds — e.g. ('equipment', 'CH-04',
// 'images'), appended via arrayUnion so it doesn't clobber other photos
// added (online or queued) in the meantime.
export async function queuePendingImage({ dataUrl, folder, targetCollection, targetDocId, targetField }) {
  const id = `pending-${crypto.randomUUID()}`;
  const record = { id, dataUrl, folder, targetCollection, targetDocId, targetField, createdAt: new Date().toISOString() };
  await withStore('readwrite', (store) => store.put(record));
  return id;
}

export async function getPendingImagesForDoc(targetCollection, targetDocId) {
  const idb = await openDb();
  const tx = idb.transaction(STORE_NAME, 'readonly');
  const all = await reqToPromise(tx.objectStore(STORE_NAME).getAll());
  return all.filter((r) => r.targetCollection === targetCollection && r.targetDocId === targetDocId);
}

// Lets the UI cancel a queued photo the user removed before it ever
// uploaded — otherwise it would reappear once the queue next flushes.
export async function cancelPendingImageByDataUrl(targetCollection, targetDocId, dataUrl) {
  const matches = await getPendingImagesForDoc(targetCollection, targetDocId);
  const hit = matches.find((r) => r.dataUrl === dataUrl);
  if (hit) await removePendingImage(hit.id);
}

// Single entry point for "upload this photo, or queue it if that's not
// working right now" — tries a real upload first (skipped entirely when the
// browser already knows it's offline), falls back to the local queue on any
// failure or timeout. Returns a src usable immediately either way: a real
// Storage URL, or the data URL itself while the real upload is pending.
export async function uploadImageWithFallback({ dataUrl, folder, targetCollection, targetDocId, targetField }) {
  if (navigator.onLine) {
    try {
      const url = await withTimeout(uploadImage(dataUrl, folder), UPLOAD_TIMEOUT_MS);
      return { src: url, queued: false };
    } catch {
      // fall through to queueing below
    }
  }
  await queuePendingImage({ dataUrl, folder, targetCollection, targetDocId, targetField });
  return { src: dataUrl, queued: true };
}

export async function getAllPendingImages() {
  const idb = await openDb();
  const tx = idb.transaction(STORE_NAME, 'readonly');
  return reqToPromise(tx.objectStore(STORE_NAME).getAll());
}

async function removePendingImage(id) {
  await withStore('readwrite', (store) => store.delete(id));
}

// Best-effort: uploads whatever's queued and patches the matching document.
// Safe to call repeatedly (e.g. on every 'online' event, or a page reload
// that happens to already have a connection) — items that fail (still
// offline, or a transient error) are simply left queued for next time.
let flushing = false;
export async function flushPendingImages() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const pending = await getAllPendingImages();
    for (const item of pending) {
      try {
        const url = await withTimeout(uploadImage(item.dataUrl, item.folder), UPLOAD_TIMEOUT_MS);
        await setDoc(
          doc(db, item.targetCollection, item.targetDocId),
          { [item.targetField]: arrayUnion(url) },
          { merge: true }
        );
        await removePendingImage(item.id);
      } catch (err) {
        console.warn('Offline image queue: upload still failing for', item.id, err);
      }
    }
  } finally {
    flushing = false;
  }
}
