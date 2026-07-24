import { createContext, useContext } from 'react';

export const FactoryContext = createContext(null);

export const SELECTED_KEY = 'selectedFactory';

// allowedFactories is null for admin (unrestricted) or an engineer's
// assigned-factory list — pass it to scope the option list to what
// that engineer is actually allowed to see.
export function readFactories(allowedFactories) {
  try {
    const eq = JSON.parse(localStorage.getItem('equipment') || '[]');
    const all = [...new Set(eq.map((e) => e.factory).filter(Boolean))];
    if (!allowedFactories) return all;
    return all.filter((f) => allowedFactories.includes(f));
  } catch { return []; }
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
