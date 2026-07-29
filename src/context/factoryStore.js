import { createContext, useContext } from 'react';
import { loadSettings } from './settingsStore.js';

export const FactoryContext = createContext(null);

export const SELECTED_KEY = 'selectedFactory';
export const MANUAL_FACTORIES_KEY = 'manualFactories';
export const FACTORY_META_KEY = 'factoryMeta';

// Every factory in the app is named "โรงงาน<something>" — new ones only ask
// for the <something> and this gets prepended automatically.
export const FACTORY_NAME_PREFIX = 'โรงงาน';

// Factories manually registered by an admin (e.g. before any equipment
// exists for them yet), separate from the ones implied by equipment records.
export function loadManualFactories() {
  try { return JSON.parse(localStorage.getItem(MANUAL_FACTORIES_KEY) || '[]'); } catch { return []; }
}

export function saveManualFactories(list) {
  localStorage.setItem(MANUAL_FACTORIES_KEY, JSON.stringify(list));
}

export function addManualFactory(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = readFactories();
  if (existing.includes(trimmed)) return;
  saveManualFactories([...loadManualFactories(), trimmed]);
}

export function removeManualFactory(name) {
  saveManualFactories(loadManualFactories().filter((f) => f !== name));
}

// Optional description/province per factory — kept separate from the name
// list above since every factory (equipment-derived or manual) can have it.
export function loadFactoryMeta() {
  try { return JSON.parse(localStorage.getItem(FACTORY_META_KEY) || '{}'); } catch { return {}; }
}

export function saveFactoryMeta(map) {
  localStorage.setItem(FACTORY_META_KEY, JSON.stringify(map));
}

export function getFactoryMeta(name) {
  const map = loadFactoryMeta();
  return { description: '', province: '', image: '', ...map[name] };
}

export function setFactoryMeta(name, meta) {
  const map = loadFactoryMeta();
  map[name] = { ...map[name], ...meta };
  saveFactoryMeta(map);
}

// allowedFactories is null for admin (unrestricted) or an engineer's
// assigned-factory list — pass it to scope the option list to what
// that engineer is actually allowed to see. `equipmentList` is fetched by
// the caller (equipment now lives in Firestore, not localStorage).
export function readFactories(allowedFactories, equipmentList = []) {
  const fromEquipment = equipmentList.map((e) => e.factory).filter(Boolean);
  const all = [...new Set([...fromEquipment, ...loadManualFactories()])];
  if (!allowedFactories) return all;
  return all.filter((f) => allowedFactories.includes(f));
}

// Aggregate stats for one factory, derived from data already saved elsewhere
// (equipment list, saved calculation results, saved measures) — there is no
// separate "factory energy" figure stored anywhere. `equipmentList` and
// `measuresList` are fetched by the caller (both now live in Firestore);
// history still lives in localStorage for now.
export function computeFactoryStats(factoryName, equipmentList = [], measuresList = []) {
  const equipment = equipmentList;
  let history = [];
  try { history = JSON.parse(localStorage.getItem('history') || '[]'); } catch { /* ignore */ }
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

  const operatingHours = parseFloat(loadSettings().defaultOperatingHours) || 0;
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
