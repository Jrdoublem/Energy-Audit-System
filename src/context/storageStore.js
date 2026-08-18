import { ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase.js';

export async function uploadImage(dataUrl, folder) {
  const ext = dataUrl.startsWith('data:image/png') ? 'png' : 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const imageRef = ref(storage, `${folder}/${fileName}`);
  await uploadString(imageRef, dataUrl, 'data_url');
  return getDownloadURL(imageRef);
}

export async function uploadFile(file, folder = 'catalog_pdf') {
  const ext = file.name ? file.name.split('.').pop() : 'pdf';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const fileRef = ref(storage, `${folder}/${fileName}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
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
