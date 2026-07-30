// Equipment model catalog (brand/model reference library), backed by
// Firestore (collection 'catalog'). Reads and writes are both open to any
// signed-in user — the Catalog page's add/edit/delete actions have never
// been admin-gated, so this preserves existing behavior rather than
// tightening it as part of the storage migration.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const CATALOG_COLLECTION = 'catalog';

export async function fetchAllCatalogItems() {
  const snap = await getDocs(collection(db, CATALOG_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveCatalogItem(item) {
  const { id, ...rest } = item;
  await setDoc(doc(db, CATALOG_COLLECTION, String(id)), rest);
}

export async function deleteCatalogItem(id) {
  await deleteDoc(doc(db, CATALOG_COLLECTION, String(id)));
}
