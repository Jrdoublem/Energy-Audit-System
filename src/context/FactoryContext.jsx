import { useCallback, useEffect, useMemo, useState } from 'react';
import { FactoryContext, SELECTED_KEY, readFactories, fetchAllFactoryRecords } from './factoryStore.js';
import { getSession } from './authStore.js';
import { fetchAllEquipment } from './equipmentStore.js';

function readAllowedFactories() {
  const session = getSession();
  return session.role === 'engineer' ? (session.factories || []) : null;
}

export function FactoryProvider({ children }) {
  // Read once per session — role/assignment only change on the next login.
  const [allowedFactories] = useState(readAllowedFactories);
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactoryState] = useState(() => localStorage.getItem(SELECTED_KEY) || '');

  const refreshFactories = useCallback(async () => {
    const [equipment, factoryRecords] = await Promise.all([fetchAllEquipment(), fetchAllFactoryRecords()]);
    setFactories(readFactories(allowedFactories, equipment, factoryRecords));
  }, [allowedFactories]);

  useEffect(() => {
    Promise.all([fetchAllEquipment(), fetchAllFactoryRecords()])
      .then(([equipment, factoryRecords]) => setFactories(readFactories(allowedFactories, equipment, factoryRecords)));
  }, [allowedFactories]);

  const setSelectedFactory = useCallback((factory) => {
    setSelectedFactoryState(factory);
    if (factory) localStorage.setItem(SELECTED_KEY, factory);
    else localStorage.removeItem(SELECTED_KEY);
  }, []);

  const value = useMemo(
    () => ({ factories, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories }),
    [factories, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories]
  );

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}
