import { useMemo } from 'react';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { readFactories } from '../context/factoryStore.js';
import { getSession, loadUsers } from '../context/authStore.js';
import { MapPinIcon, UserIcon } from '../components/icons';

function loadEquipment() {
  try { return JSON.parse(localStorage.getItem('equipment') || '[]'); } catch { return []; }
}

function StatCard({ label, value }) {
  return (
    <Panel className="p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-[#0F2854]">{value}</p>
    </Panel>
  );
}

function Factories() {
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const equipment = useMemo(() => loadEquipment(), []);
  const users = useMemo(() => loadUsers(), []);
  const factories = useMemo(() => readFactories(), []);

  const rows = useMemo(() => factories.map((f) => ({
    name: f,
    equipCount: equipment.filter((e) => e.factory === f).length,
    engineers: users.filter((u) => u.role === 'engineer' && (u.factories || []).includes(f)),
  })), [factories, equipment, users]);

  const assignedEngineerCount = users.filter((u) => u.role === 'engineer' && (u.factories || []).length > 0).length;

  if (!isAdmin) {
    return (
      <AppLayout title="รายชื่อโรงงาน">
        <Panel className="p-8 text-center text-sm text-gray-400">
          หน้านี้สำหรับผู้ดูแลระบบเท่านั้น
        </Panel>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="รายชื่อโรงงาน">
      <div className="flex flex-col gap-5 max-w-3xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="โรงงานทั้งหมด" value={factories.length} />
          <StatCard label="อุปกรณ์ทั้งหมด" value={equipment.length} />
          <StatCard label="วิศวกรที่มอบหมายแล้ว" value={assignedEngineerCount} />
        </div>

        <Panel className="p-5">
          <SectionHeader title="รายชื่อโรงงาน" tag={`${factories.length} โรงงาน`} />
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              ยังไม่มีโรงงานในระบบ — เพิ่มอุปกรณ์พร้อมชื่อโรงงานที่หน้าอุปกรณ์ก่อน
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.name} className="flex items-start gap-3 bg-[#F4F7FC] rounded-xl px-4 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 text-[#4988C4]">
                    <MapPinIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0F2854]">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.equipCount} อุปกรณ์</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {r.engineers.length ? r.engineers.map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1 text-[10px] bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-600">
                          <UserIcon className="w-2.5 h-2.5" />
                          {e.name}
                        </span>
                      )) : (
                        <span className="text-[10px] text-amber-500">ยังไม่มีวิศวกรรับผิดชอบ</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}

export default Factories;
