// App-wide calculation defaults, backed by Firestore (single doc,
// collection 'settings'). Read by Settings.jsx (edit), MeasureSelect.jsx and
// SavingsCalculator.jsx (prefill evaluation forms).
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

const SETTINGS_COLLECTION = 'settings';
const SETTINGS_DOC_ID = 'app';

export const DEFAULT_SETTINGS = {
  defaultElectricityRate: '4.50',
  defaultOperatingHours: '8000',
};

export async function fetchSettings() {
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
}

export async function saveSettingsItem(next) {
  await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), next, { merge: true });
}
