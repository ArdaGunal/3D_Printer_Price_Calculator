// ─── Centralized AsyncStorage Operations ─────────────
// Safe read/update/write for filament inventory.
// Ensures other filaments are never corrupted during updates.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, normalizeItem, FilamentItem } from './types';

// ─── Load inventory from AsyncStorage ─────────────────
export async function loadInventory(): Promise<FilamentItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.inventory);
    if (!raw) return [];
    return (JSON.parse(raw) as any[]).map(normalizeItem);
  } catch (e) {
    console.log('loadInventory error:', e);
    return [];
  }
}

// ─── Save full inventory to AsyncStorage ──────────────
export async function saveInventory(items: FilamentItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(items));
}

// ─── Deduct stock from multiple filaments ─────────────
// Used by the calculator's "Confirm Production" feature.
// Returns the updated list or throws on error.
export async function deductStockFromInventory(
  deductions: { id: string; grams: number }[]
): Promise<FilamentItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.inventory);
  if (!raw) throw new Error('Envanter verisi bulunamadı.');
  const storedList: any[] = JSON.parse(raw);

  for (const { id, grams } of deductions) {
    const idx = storedList.findIndex((f) => f.id === id);
    if (idx >= 0) {
      // Only reduce stockGrams (remaining stock).
      // weightGrams (original spool weight) and pricePerKg stay unchanged.
      const currentStock = storedList[idx].stockGrams ?? storedList[idx].weightGrams ?? 1000;
      storedList[idx].stockGrams = Math.max(0, currentStock - grams);
      
      // Auto-archive if stock is exhausted
      if (storedList[idx].stockGrams <= 0) {
        storedList[idx].isActive = false;
      }
    }
  }

  await AsyncStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(storedList));
  return storedList.map(normalizeItem);
}

// ─── Quick consume from a single filament ─────────────
// Used by the inventory screen's "Quick Consume" modal.
export async function quickConsumeFilament(
  id: string,
  grams: number
): Promise<FilamentItem[]> {
  return deductStockFromInventory([{ id, grams }]);
}

// ─── Load recent colors ───────────────────────────────
export async function loadRecentColors(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentColors);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── Save recent color ────────────────────────────────
export async function addRecentColor(hex: string, current: string[]): Promise<string[]> {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) return current;
  const upper = hex.toUpperCase();
  const updated = [upper, ...current.filter((c) => c !== upper)].slice(0, 7);
  await AsyncStorage.setItem(STORAGE_KEYS.recentColors, JSON.stringify(updated));
  return updated;
}
