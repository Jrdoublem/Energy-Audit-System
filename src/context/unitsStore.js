// Measurement units master list, backed by Firestore (collection 'units').
// Reads are allowed for any signed-in user; writes are admin-only per the
// Firestore security rules — see Units.jsx for the matching UI gating.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const UNITS_COLLECTION = 'units';

export async function fetchAllUnits() {
  const snap = await getDocs(collection(db, UNITS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveUnitItem(item) {
  const { id, ...rest } = item;
  await setDoc(doc(db, UNITS_COLLECTION, id), rest);
}

export async function deleteUnitItem(id) {
  await deleteDoc(doc(db, UNITS_COLLECTION, id));
}
