// Equipment categories, persisted to localStorage['categories'] as
// { key, label, iconKey } — iconKey is resolved to a component via
// ICON_MAP (src/components/icons.jsx) since components aren't JSON-safe.
// Shared by Equipment.jsx (manage) and Settings.jsx (read-only overview).
export const INITIAL_CATEGORIES = [
  { key: 'all', label: 'ALL', iconKey: 'ClipboardIcon' },
  { key: 'chiller', label: 'Chiller', iconKey: 'SnowflakeIcon' },
  { key: 'compressor', label: 'Compressor', iconKey: 'CompressorIcon' },
  { key: 'pump', label: 'Pump', iconKey: 'DropletIcon' },
  { key: 'boiler', label: 'Boiler', iconKey: 'FlameIcon' },
  { key: 'cooling', label: 'Cooling Tower', iconKey: 'CoolingTowerIcon' },
  { key: 'electrical', label: 'Electrical', iconKey: 'LightningIcon' },
];

export function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem('categories') || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore corrupt data */ }
  localStorage.setItem('categories', JSON.stringify(INITIAL_CATEGORIES));
  return INITIAL_CATEGORIES;
}
