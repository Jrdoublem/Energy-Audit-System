// Equipment + categories, backed by Firestore (collections 'equipment' and
// 'categories'). Reads are allowed for any signed-in user; writes are
// admin-only per the Firestore security rules — see Equipment.jsx for the
// matching UI gating that hides add/edit/delete controls for engineers.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const EQUIPMENT_COLLECTION = 'equipment';
const CATEGORIES_COLLECTION = 'categories';

export async function fetchAllEquipment() {
  const snap = await getDocs(collection(db, EQUIPMENT_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveEquipmentItem(item) {
  const { id, ...rest } = item;
  await setDoc(doc(db, EQUIPMENT_COLLECTION, id), rest);
}

export async function deleteEquipmentItem(id) {
  await deleteDoc(doc(db, EQUIPMENT_COLLECTION, id));
}

// Firestore has no stable default order without an explicit orderBy — sort
// to the app's intended category order instead of whatever comes back
// (which behaved like alphabetical-by-key, e.g. Boiler before Chiller).
const CATEGORY_ORDER = ['all', 'chiller', 'compressor', 'pump', 'boiler', 'cooling', 'electrical'];

export async function fetchAllCategories() {
  const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
  const categories = snap.docs.map((d) => ({ key: d.id, ...d.data() }));
  return categories.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.key);
    const bi = CATEGORY_ORDER.indexOf(b.key);
    return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
  });
}

export async function saveCategoryItem(category) {
  const { key, ...rest } = category;
  await setDoc(doc(db, CATEGORIES_COLLECTION, key), rest);
}
