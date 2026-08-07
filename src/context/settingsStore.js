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
  defaultCarbonPrice: '200',
  // `key` marks the two factors real calculations read (see
  // SavingsCalculator.jsx / MeasureSelect.jsx) — those two always fall back
  // to their hardcoded default if missing/edited away, so deleting or
  // mis-editing a row here can never break a calculation. Rows without a
  // `key` (anything an admin adds via "+") are reference-only for now.
  emissionFactors: [
    { id: 'grid_electricity', key: 'electricity', name: 'Electricity (Grid mix)', unit: 'kWh', value: '0.5561', source: 'TGO 2024' },
    { id: 'fuel_boiler', key: 'fuel', name: 'Fuel Oil (Boiler)', unit: 'kWh', value: '0.2664', source: 'TGO 2024' },
    { id: 'tap_water', key: null, name: 'Tap Water', unit: 'm3', value: '0.7836', source: 'TGO 2024' },
  ],
};

export async function fetchSettings() {
  const snap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
}

export async function saveSettingsItem(next) {
  await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), next, { merge: true });
}

// Looks up an emission factor by its stable `key` (see DEFAULT_SETTINGS
// above) rather than by display name, so admins can freely rename/reorder
// rows in the Admin Panel without breaking the calculators that read this.
export function getEmissionFactorValue(settings, key, fallback) {
  const factor = (settings?.emissionFactors || []).find((f) => f.key === key);
  const value = parseFloat(factor?.value);
  return Number.isFinite(value) ? value : fallback;
}
