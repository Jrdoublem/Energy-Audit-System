import {
  ClipboardIcon, SnowflakeIcon, CompressorIcon, DropletIcon, FlameIcon,
  CoolingTowerIcon, LightningIcon, GearIcon,
} from './icons';

// Equipment categories are persisted with an iconKey string (component
// references aren't JSON-serializable) — this map resolves that key back
// to a component. Shared by Equipment.jsx and Settings.jsx.
export const ICON_MAP = {
  ClipboardIcon, SnowflakeIcon, CompressorIcon, DropletIcon, FlameIcon,
  CoolingTowerIcon, LightningIcon, GearIcon,
};
