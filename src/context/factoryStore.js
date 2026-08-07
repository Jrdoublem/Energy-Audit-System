import { createContext, useContext } from 'react';
import {
  collection, doc, getDocs, setDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.js';

export const FactoryContext = createContext(null);

export const SELECTED_KEY = 'selectedFactory';

// Every factory in the app is named "โรงงาน<something>" — new ones only ask
// for the <something> and this gets prepended automatically.
export const FACTORY_NAME_PREFIX = 'โรงงาน';

// Factory records — backed by Firestore (collection 'factories', doc id =
// factory name). A record only exists once a factory has been manually
// added or edited (description/province/image); factories that only exist
// because equipment references them have no record and fall back to empty
// meta. `manual: true` marks factories registered before any equipment
// exists for them yet (as opposed to ones only implied by equipment).
const FACTORIES_COLLECTION = 'factories';

export async function fetchAllFactoryRecords() {
  const snap = await getDocs(collection(db, FACTORIES_COLLECTION));
  return snap.docs.map((d) => ({ name: d.id, ...d.data() }));
}

export async function saveFactoryRecord(name, data) {
  await setDoc(doc(db, FACTORIES_COLLECTION, name), data, { merge: true });
}

export async function deleteFactoryRecord(name) {
  await deleteDoc(doc(db, FACTORIES_COLLECTION, name));
}

// allowedFactories is null for admin (unrestricted) or an engineer's
// assigned-factory list — pass it to scope the option list to what that
// engineer is actually allowed to see. `equipmentList` and `factoryRecords`
// are both fetched by the caller (both now live in Firestore).
export function readFactories(allowedFactories, equipmentList = [], factoryRecords = []) {
  const fromEquipment = equipmentList.map((e) => e.factory).filter(Boolean);
  const manualNames = factoryRecords.filter((f) => f.manual).map((f) => f.name);
  const all = [...new Set([...fromEquipment, ...manualNames])];
  if (!allowedFactories) return all;
  return all.filter((f) => allowedFactories.includes(f));
}

export function getFactoryMeta(name, factoryRecords = []) {
  const rec = factoryRecords.find((f) => f.name === name);
  return { description: rec?.description || '', province: rec?.province || '', image: rec?.image || '' };
}

// Aggregate stats for one factory, derived from data already saved elsewhere
// (equipment list, saved calculation results, saved measures) — there is no
// separate "factory energy" figure stored anywhere. `equipmentList`,
// `measuresList`, and `historyList` are all fetched by the caller (all now
// live in Firestore). `defaultOperatingHours` is the admin-configured
// calculation default (fetched by the caller via settingsStore) — used to
// annualize the latest calculated power draw for equipment with no measure
// evaluation yet.
export function computeFactoryStats(factoryName, equipmentList = [], measuresList = [], historyList = [], defaultOperatingHours = 8000) {
  const equipment = equipmentList;
  const history = historyList;
  const measures = measuresList;

  const equipCount = equipment.filter((e) => e.factory === factoryName).length;

  // Latest saved calculation per equipment id (a piece of equipment may have
  // been calculated/saved more than once) — each one carries powerBaseline
  // (kW), the one figure every category's calculator produces consistently.
  const latestByEquip = {};
  history
    .filter((h) => h.item?.factory === factoryName)
    .forEach((h) => {
      const id = h.item?.id;
      if (!id) return;
      if (!latestByEquip[id] || new Date(h.savedAt) > new Date(latestByEquip[id].savedAt)) {
        latestByEquip[id] = h;
      }
    });

  const operatingHours = parseFloat(defaultOperatingHours) || 0;
  const energyKWhYear = Object.values(latestByEquip).reduce((sum, h) => {
    const power = parseFloat(h.result?.powerBaseline ?? h.result?.powerCF ?? 0);
    return power > 0 ? sum + power * operatingHours : sum;
  }, 0);

  // Potential savings — sum of every saved measure for this factory whose
  // evaluation form was actually filled in (same formula as EvalSection).
  const potentialSavings = measures
    .filter((m) => m.factory === factoryName)
    .reduce((sum, m) => {
      const base = parseFloat(m.formData?.powerCurrent || m.formData?.power || 0);
      const pct  = parseFloat(m.evalData?.percentReduction || 0);
      const hrs  = parseFloat(m.evalData?.operatingHours || 0);
      const rate = parseFloat(m.evalData?.electricityRate || 0);
      if (base > 0 && pct > 0 && hrs > 0 && rate > 0) {
        return sum + base * (pct / 100) * hrs * rate;
      }
      return sum;
    }, 0);

  return { equipCount, energyKWhYear, potentialSavings };
}

// Single source of truth for "does this record belong in the current view":
// selectedFactory (one factory picked) wins if set; otherwise admins see
// everything and engineers see everything within their assigned set.
export function matchesFactory(itemFactory, selectedFactory, allowedFactories) {
  if (selectedFactory) return itemFactory === selectedFactory;
  if (allowedFactories) return allowedFactories.includes(itemFactory);
  return true;
}

export function useFactory() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactory must be used within a FactoryProvider');
  return ctx;
}
