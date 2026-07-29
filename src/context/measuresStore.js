// Saved energy-conservation measures, backed by Firestore (collection
// 'measures'). Reads are allowed for any signed-in user; writes are also
// open to any signed-in user (unlike equipment/categories) since recording
// a measure is normal day-to-day engineer work, not an admin-only action.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const MEASURES_COLLECTION = 'measures';

export async function fetchAllMeasures() {
  const snap = await getDocs(collection(db, MEASURES_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveMeasureItem(measure) {
  const { id, ...rest } = measure;
  await setDoc(doc(db, MEASURES_COLLECTION, String(id)), rest);
}

export async function deleteMeasureItem(id) {
  await deleteDoc(doc(db, MEASURES_COLLECTION, String(id)));
}
