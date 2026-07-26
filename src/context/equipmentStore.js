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

export async function fetchAllCategories() {
  const snap = await getDocs(collection(db, CATEGORIES_COLLECTION));
  return snap.docs.map((d) => ({ key: d.id, ...d.data() }));
}

export async function saveCategoryItem(category) {
  const { key, ...rest } = category;
  await setDoc(doc(db, CATEGORIES_COLLECTION, key), rest);
}
