// Default equipment categories — seeded into the Firestore 'categories'
// collection once; iconKey is resolved to a component via ICON_MAP
// (src/components/icons.jsx) since components aren't JSON-safe.
export const INITIAL_CATEGORIES = [
  { key: 'all', label: 'ALL', iconKey: 'ClipboardIcon' },
  { key: 'chiller', label: 'Chiller', iconKey: 'SnowflakeIcon' },
  { key: 'compressor', label: 'Compressor', iconKey: 'CompressorIcon' },
  { key: 'pump', label: 'Pump', iconKey: 'DropletIcon' },
  { key: 'boiler', label: 'Boiler', iconKey: 'FlameIcon' },
  { key: 'cooling', label: 'Cooling Tower', iconKey: 'CoolingTowerIcon' },
  { key: 'electrical', label: 'Electrical', iconKey: 'LightningIcon' },
];
