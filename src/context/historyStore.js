// Saved calculation/inspection history, backed by Firestore (collection
// 'history'). Reads and writes are open to any signed-in user — same as
// measures, since saving a calculation result is normal day-to-day work.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const HISTORY_COLLECTION = 'history';

export async function fetchAllHistory() {
  const snap = await getDocs(collection(db, HISTORY_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveHistoryItem(record) {
  const { id, ...rest } = record;
  await setDoc(doc(db, HISTORY_COLLECTION, String(id)), rest);
}

export async function deleteHistoryItem(id) {
  await deleteDoc(doc(db, HISTORY_COLLECTION, String(id)));
}
