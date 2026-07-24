import { createContext, useContext } from 'react';

export const FactoryContext = createContext(null);

export const SELECTED_KEY = 'selectedFactory';

export function readFactories() {
  try {
    const eq = JSON.parse(localStorage.getItem('equipment') || '[]');
    return [...new Set(eq.map((e) => e.factory).filter(Boolean))];
  } catch { return []; }
}

export function useFactory() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactory must be used within a FactoryProvider');
  return ctx;
}
