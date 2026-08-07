// Saved M&V reports, backed by Firestore (collection 'reports'). Reads and
// writes are open to any signed-in user — same as measures/history.
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

const REPORTS_COLLECTION = 'reports';

export async function fetchAllReports() {
  const snap = await getDocs(collection(db, REPORTS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveReportItem(record) {
  const { id, ...rest } = record;
  await setDoc(doc(db, REPORTS_COLLECTION, String(id)), rest);
}

export async function deleteReportItem(id) {
  await deleteDoc(doc(db, REPORTS_COLLECTION, String(id)));
}
