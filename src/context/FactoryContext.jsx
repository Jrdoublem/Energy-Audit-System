import { useCallback, useMemo, useState } from 'react';
import { FactoryContext, SELECTED_KEY, readFactories } from './factoryStore.js';

export function FactoryProvider({ children }) {
  const [factories, setFactories] = useState(readFactories);
  const [selectedFactory, setSelectedFactoryState] = useState(() => localStorage.getItem(SELECTED_KEY) || '');

  const setSelectedFactory = useCallback((factory) => {
    setSelectedFactoryState(factory);
    if (factory) localStorage.setItem(SELECTED_KEY, factory);
    else localStorage.removeItem(SELECTED_KEY);
  }, []);

  const refreshFactories = useCallback(() => {
    setFactories(readFactories());
  }, []);

  const value = useMemo(
    () => ({ factories, selectedFactory, setSelectedFactory, refreshFactories }),
    [factories, selectedFactory, setSelectedFactory, refreshFactories]
  );

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}
