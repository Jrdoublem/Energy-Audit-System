import { useCallback, useEffect, useMemo, useState } from 'react';
import { FactoryContext, SELECTED_KEY, readFactories, subscribeToAllFactoryRecords, fetchAllFactoryRecords } from './factoryStore.js';
import { getSession } from './authStore.js';
import { subscribeToAllEquipment, fetchAllEquipment } from './equipmentStore.js';

function readAllowedFactories() {
  const session = getSession();
  return session.role === 'engineer' ? (session.factories || []) : null;
}

export function FactoryProvider({ children }) {
  // Read once per session — role/assignment only change on the next login.
  const [allowedFactories] = useState(readAllowedFactories);
  const [factories, setFactories] = useState([]);
  const [factoryRecords, setFactoryRecords] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [selectedFactory, setSelectedFactoryState] = useState(() => localStorage.getItem(SELECTED_KEY) || '');

  const refreshFactories = useCallback(async () => {
    const [equipment, records] = await Promise.all([fetchAllEquipment(), fetchAllFactoryRecords()]);
    setFactoryRecords(records);
    setEquipmentList(equipment);
    setFactories(readFactories(allowedFactories, equipment, records));
  }, [allowedFactories]);

  useEffect(() => {
    let currEquip = [];
    let currRecs = [];

    const unsubEquip = subscribeToAllEquipment((eq) => {
      currEquip = eq;
      setEquipmentList(eq);
      setFactories(readFactories(allowedFactories, currEquip, currRecs));
    });

    const unsubRecs = subscribeToAllFactoryRecords((recs) => {
      currRecs = recs;
      setFactoryRecords(recs);
      setFactories(readFactories(allowedFactories, currEquip, currRecs));
    });

    return () => {
      if (unsubEquip) unsubEquip();
      if (unsubRecs) unsubRecs();
    };
  }, [allowedFactories]);

  const setSelectedFactory = useCallback((factory) => {
    setSelectedFactoryState(factory);
    if (factory) localStorage.setItem(SELECTED_KEY, factory);
    else localStorage.removeItem(SELECTED_KEY);
  }, []);

  const value = useMemo(
    () => ({ factories, factoryRecords, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories }),
    [factories, factoryRecords, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories]
  );

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}
