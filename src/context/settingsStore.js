// App-wide calculation defaults, persisted to localStorage['settings'].
// Read by Settings.jsx (edit) and MeasureSelect.jsx (prefill evaluation form).
const KEY = 'settings';

export const DEFAULT_SETTINGS = {
  defaultElectricityRate: '4.50',
  defaultOperatingHours: '8000',
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') return { ...DEFAULT_SETTINGS, ...saved };
  } catch { /* ignore corrupt data */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
