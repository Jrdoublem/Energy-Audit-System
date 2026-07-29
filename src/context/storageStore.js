// Image uploads, backed by Firebase Storage. Callers resize/re-encode the
// file client-side first (see src/utils/image.js) and pass in the resulting
// data URL — this just uploads it and hands back the public download URL to
// store on the record (factory/catalog doc) instead of the image itself.
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase.js';

export async function uploadImage(dataUrl, folder) {
  const ext = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const imageRef = ref(storage, `${folder}/${fileName}`);
  await uploadString(imageRef, dataUrl, 'data_url');
  return getDownloadURL(imageRef);
}

// Best-effort: called when a factory/catalog item is deleted so its photo
// doesn't linger in Storage. Never throws — a stale/already-gone URL
// shouldn't block the actual record deletion.
export async function deleteImage(url) {
  if (!url || !url.startsWith('http')) return;
  try {
    await deleteObject(ref(storage, url));
  } catch {
    // ignore — already deleted, or not a Storage URL
  }
}
