import { useCallback, useMemo, useState } from 'react';
import { FactoryContext, SELECTED_KEY, readFactories } from './factoryStore.js';
import { getSession } from './authStore.js';

function readAllowedFactories() {
  const session = getSession();
  return session.role === 'engineer' ? (session.factories || []) : null;
}

export function FactoryProvider({ children }) {
  // Read once per session — role/assignment only change on the next login.
  const [allowedFactories] = useState(readAllowedFactories);
  const [factories, setFactories] = useState(() => readFactories(allowedFactories));
  const [selectedFactory, setSelectedFactoryState] = useState(() => localStorage.getItem(SELECTED_KEY) || '');

  const setSelectedFactory = useCallback((factory) => {
    setSelectedFactoryState(factory);
    if (factory) localStorage.setItem(SELECTED_KEY, factory);
    else localStorage.removeItem(SELECTED_KEY);
  }, []);

  const refreshFactories = useCallback(() => {
    setFactories(readFactories(allowedFactories));
  }, [allowedFactories]);

  const value = useMemo(
    () => ({ factories, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories }),
    [factories, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories]
  );

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}
