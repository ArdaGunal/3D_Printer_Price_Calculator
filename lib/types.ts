// ─── Shared Types & Helpers ───────────────────────────
// Single source of truth for data models used across all screens.

// ─── Storage Keys ─────────────────────────────────────
export const STORAGE_KEYS = {
  inputs: '@print_calc_inputs',
  inventory: '@print_calc_inventory',
  hourlyCost: '@print_calc_hourly',
  serviceFee: '@print_calc_service_fee',
  catalog: '@print_calc_catalog',
  recentColors: '@recent_colors',
};

// ─── Filament Types ───────────────────────────────────
export const FILAMENT_TYPES = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC', 'HIPS'];

// ─── Predefined Palette Colors ────────────────────────
export const PALETTE_COLORS = [
  '#FFFFFF', '#E0E0E0', '#9E9E9E', '#616161', '#424242', '#000000',
  '#FFEBEE', '#FFCDD2', '#EF5350', '#F44336', '#D32F2F', '#B71C1C',
  '#FFF3E0', '#FFCC80', '#FFA726', '#FF9800', '#F57C00', '#E65100',
  '#FFFDE7', '#FFF59D', '#FFEE58', '#FFEB3B', '#FBC02D', '#F57F17',
  '#E8F5E9', '#A5D6A7', '#66BB6A', '#4CAF50', '#388E3C', '#1B5E20',
  '#E3F2FD', '#90CAF9', '#42A5F5', '#2196F3', '#1976D2', '#0D47A1',
  '#F3E5F5', '#CE93D8', '#AB47BC', '#9C27B0', '#7B1FA2', '#4A148C',
  '#FCE4EC', '#F48FB1', '#EC407A', '#E91E63', '#C2185B', '#880E4F',
];

// ─── FilamentItem Interface ───────────────────────────
export interface FilamentItem {
  id: string;
  name?: string;       // Legacy support
  brand?: string;
  color?: string;
  hexColor?: string;
  isFavorite?: boolean;
  isActive?: boolean;
  type: string;
  price: number;
  weightGrams: number;   // Original spool weight (never changes after creation)
  pricePerKg: number;    // Derived from price/weightGrams (never changes after creation)
  stockGrams?: number;   // Remaining stock in grams (decreases with consumption)
  kValue?: number;        // Flow dynamics / K-Value (optional)
}

// ─── FilamentUsage (calculator rows) ──────────────────
export interface FilamentUsage {
  rowId: string;
  filamentId: string;
  grams: string;
}

// ─── InputState (calculator) ──────────────────────────
export interface InputState {
  hours: string;
  minutes: string;
  profitMultiplier: string;
  profitType: 'multiplier' | 'percentage';
  extraCosts: string;
  pieceCount: string;
  filamentRows: FilamentUsage[];
}

// ─── Helper: Normalize Legacy Items ───────────────────
/** Ensure pricePerKg is always correct, whether old or new format */
export function normalizeItem(raw: any): FilamentItem {
  const weightGrams = raw.weightGrams ?? 1000;
  const price = raw.price ?? raw.pricePerKg ?? 0;
  // stockGrams defaults to weightGrams for legacy items that don't have it yet
  const stockGrams = raw.stockGrams ?? weightGrams;
  return {
    id: raw.id,
    name: raw.name,
    brand: raw.brand,
    color: raw.color,
    hexColor: raw.hexColor,
    isFavorite: raw.isFavorite ?? false,
    isActive: raw.isActive !== false,
    type: raw.type,
    price,
    weightGrams,
    pricePerKg: weightGrams > 0 ? (price / weightGrams) * 1000 : 0,
    stockGrams,
    kValue: raw.kValue ?? undefined,
  };
}

// ─── Helper: Compute Price per KG ─────────────────────
export function computePricePerKg(price: number, weightGrams: number): number {
  if (!weightGrams || weightGrams <= 0) return 0;
  return (price / weightGrams) * 1000;
}

// ─── Helper: Title Case ──────────────────────────────
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Helper: Make a new filament usage row ────────────
export const makeRow = (): FilamentUsage => ({
  rowId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
  filamentId: '',
  grams: '',
});

// ─── Defaults ─────────────────────────────────────────
export const DEFAULT_HOURLY_COST = 5;
export const DEFAULT_SERVICE_FEE = 0;

export const DEFAULT_INPUTS: InputState = {
  hours: '',
  minutes: '',
  profitMultiplier: '2.5',
  profitType: 'multiplier',
  extraCosts: '',
  pieceCount: '1',
  filamentRows: [makeRow()],
};
