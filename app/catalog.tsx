import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// ─── Colors ───────────────────────────────────────────
const COLORS = {
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2C2C2E',
  border: '#3A3A3C',
  accent: '#4A69BD',
  accentLight: '#6A89CC',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  danger: '#D66666',
  success: '#48C78E',
  warning: '#D4A373',
  priceCard: '#4A90E2',
  costCard: '#D66666',
  profitCard: '#48C78E',
  serviceCard: '#D4A373',
};

const TYPE_COLORS: Record<string, string> = {
  PLA: '#4CAF50', PETG: '#2196F3', ABS: '#FF9800', ASA: '#F44336',
  TPU: '#9C27B0', Nylon: '#00BCD4', PC: '#795548', HIPS: '#607D8B',
};

const STORAGE_KEYS = {
  catalog: '@print_calc_catalog',
  inventory: '@print_calc_inventory',
  hourlyCost: '@print_calc_hourly',
  serviceFee: '@print_calc_service_fee',
  inputs: '@print_calc_inputs',
};

// ─── Types ────────────────────────────────────────────
interface FilamentItem {
  id: string;
  name: string;
  type: string;
  price?: number;
  weightGrams?: number;
  pricePerKg: number;
}

interface FilamentUsageSnapshot {
  filamentId: string;
  filamentName: string;
  filamentType: string;
  grams: number;
  pricePerKg: number;
}

export interface CatalogProduct {
  id: string;
  modelName: string;
  customerName?: string;
  modelUrl?: string;
  createdAt: number;
  filaments: FilamentUsageSnapshot[];
  pieceCount: number;
  hours: number;
  minutes: number;
  profitMultiplier: number;
  profitType?: 'multiplier' | 'percentage';
  extraCosts: number;
  // Computed at save time
  totalGrams: number;
  unitSalePrice: number;
}

function normalizeItem(raw: any): FilamentItem {
  const weightGrams = raw.weightGrams ?? 1000;
  const price = raw.price ?? raw.pricePerKg ?? 0;
  return { ...raw, price, weightGrams, pricePerKg: (price / weightGrams) * 1000 };
}

// ─── Recalculate with latest inventory prices ─────────
function recalcProduct(
  product: CatalogProduct,
  inventory: FilamentItem[],
  hourlyCost: number,
  serviceFee: number
): { totalCost: number; unitSalePrice: number; updatedFilaments: FilamentUsageSnapshot[] } {
  const updatedFilaments = product.filaments.map((f) => {
    const latest = inventory.find((i) => i.id === f.filamentId);
    return {
      ...f,
      filamentName: latest?.name ?? f.filamentName,
      filamentType: latest?.type ?? f.filamentType,
      pricePerKg: latest?.pricePerKg ?? f.pricePerKg,
    };
  });

  const filamentCost = updatedFilaments.reduce(
    (s, f) => s + f.grams * (f.pricePerKg / 1000), 0
  );
  const totalHours = product.hours + product.minutes / 60;
  const timeCost = totalHours * hourlyCost;
  const multiplier = product.profitMultiplier || 1;
  const isPercentage = product.profitType === 'percentage';
  const filamentSalePrice = isPercentage
    ? filamentCost * (1 + (multiplier / 100))
    : filamentCost * multiplier;
  const totalCost = filamentCost + timeCost + product.extraCosts + serviceFee;
  const salePrice = filamentSalePrice + timeCost + product.extraCosts + serviceFee;
  const pieces = Math.max(1, product.pieceCount);
  const unitSalePrice = salePrice / pieces;

  return { totalCost, unitSalePrice, updatedFilaments };
}

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [inventory, setInventory] = useState<FilamentItem[]>([]);
  const [hourlyCost, setHourlyCost] = useState(5);
  const [serviceFee, setServiceFee] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'name'>('newest');

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const filteredAndSortedCatalog = catalog
    .filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchName = p.modelName.toLowerCase().includes(q);
      const matchCustomer = p.customerName ? p.customerName.toLowerCase().includes(q) : false;
      return matchName || matchCustomer;
    })
    .sort((a, b) => {
      if (sortMode === 'newest') return b.createdAt - a.createdAt;
      if (sortMode === 'oldest') return a.createdAt - b.createdAt;
      if (sortMode === 'name') return a.modelName.localeCompare(b.modelName);
      return 0;
    });

  const loadAll = async () => {
    try {
      const [catRaw, invRaw, hourlyRaw, feeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.catalog),
        AsyncStorage.getItem(STORAGE_KEYS.inventory),
        AsyncStorage.getItem(STORAGE_KEYS.hourlyCost),
        AsyncStorage.getItem(STORAGE_KEYS.serviceFee),
      ]);
      if (catRaw) setCatalog(JSON.parse(catRaw));
      if (invRaw) setInventory((JSON.parse(invRaw) as any[]).map(normalizeItem));
      if (hourlyRaw) setHourlyCost(JSON.parse(hourlyRaw));
      if (feeRaw) setServiceFee(JSON.parse(feeRaw));
    } catch (e) {
      console.log('Catalog load error:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveCatalog = async (list: CatalogProduct[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(list));
  };

  // ─── Recalculate ───────────────────────────────────
  const handleRecalc = (id: string) => {
    const idx = catalog.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const product = catalog[idx];
    const { unitSalePrice, updatedFilaments } = recalcProduct(
      product, inventory, hourlyCost, serviceFee
    );
    const totalGrams = updatedFilaments.reduce((s, f) => s + f.grams, 0);
    const updated = [...catalog];
    updated[idx] = {
      ...product,
      filaments: updatedFilaments,
      totalGrams,
      unitSalePrice,
    };
    setCatalog(updated);
    saveCatalog(updated);
    Alert.alert('✅ Güncellendi', `'${product.modelName}' güncel fiyatlarla yeniden hesaplandı.\nYeni Satış: ${unitSalePrice.toFixed(2)} ₺`);
  };

  // ─── Load to Calculator ────────────────────────────
  const handleLoadToCalc = async (product: CatalogProduct) => {
    const inputState = {
      hours: String(product.hours),
      minutes: String(product.minutes),
      profitMultiplier: String(product.profitMultiplier || 1),
      profitType: product.profitType || 'multiplier',
      extraCosts: product.extraCosts ? String(product.extraCosts) : '',
      pieceCount: String(product.pieceCount),
      filamentRows: product.filaments.map((f) => ({
        rowId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        filamentId: f.filamentId,
        grams: String(f.grams),
      })),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.inputs, JSON.stringify(inputState));
    router.back();
  };

  // ─── Delete ────────────────────────────────────────
  const handleDelete = (id: string) => {
    const product = catalog.find((p) => p.id === id);
    Alert.alert('Ürünü Sil', `'${product?.modelName}' silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: () => {
          const updated = catalog.filter((p) => p.id !== id);
          setCatalog(updated);
          saveCatalog(updated);
        },
      },
    ]);
  };

  if (!isLoaded) {
    return (
      <View style={[st.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={st.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={st.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>📋 Ürün Kataloğu</Text>
          <Text style={st.headerSubtitle}>{catalog.length} kayıtlı ürün</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {/* ─── Search & Sort ─── */}
      <View style={st.searchSortContainer}>
        <View style={st.searchBar}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput
            style={st.searchInput}
            placeholder="Obje veya Kişi Ara..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={st.clearSearchBtn}>
              <Text style={st.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.sortChipContainer}>
          <TouchableOpacity
            style={[st.sortChip, sortMode === 'newest' && st.sortChipActive]}
            onPress={() => setSortMode('newest')}
          >
            <Text style={[st.sortChipText, sortMode === 'newest' && st.sortChipTextActive]}>Yeniden Eskiye</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.sortChip, sortMode === 'oldest' && st.sortChipActive]}
            onPress={() => setSortMode('oldest')}
          >
            <Text style={[st.sortChipText, sortMode === 'oldest' && st.sortChipTextActive]}>Eskiden Yeniye</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.sortChip, sortMode === 'name' && st.sortChipActive]}
            onPress={() => setSortMode('name')}
          >
            <Text style={[st.sortChipText, sortMode === 'name' && st.sortChipTextActive]}>Ad (A-Z)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {catalog.length === 0 && (
          <View style={st.emptyState}>
            <Text style={st.emptyIcon}>📋</Text>
            <Text style={st.emptyTitle}>Katalog Boş</Text>
            <Text style={st.emptyDesc}>
              Ana sayfada bir hesaplama yaptıktan sonra{'\n'}"Kataloğa Kaydet" butonuna basın
            </Text>
          </View>
        )}

        {catalog.length > 0 && filteredAndSortedCatalog.length === 0 && (
          <View style={[st.emptyState, { marginTop: 20 }]}>
            <Text style={st.emptyIcon}>🔍</Text>
            <Text style={st.emptyTitle}>Sonuç Bulunamadı</Text>
            <Text style={st.emptyDesc}>
              Arama kriterlerinize uyan bir obje veya kişi bulunamadı.
            </Text>
          </View>
        )}

        {filteredAndSortedCatalog.map((product) => {
          const isExpanded = expandedId === product.id;
          const dateStr = new Date(product.createdAt).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric',
          });

          return (
            <View key={product.id}>
              {/* ─── Compact Card ─── */}
              <TouchableOpacity
                style={[st.card, isExpanded && st.cardExpanded]}
                onPress={() => setExpandedId(isExpanded ? null : product.id)}
                activeOpacity={0.8}
              >
                <View style={st.cardLeft}>
                  <Text style={st.cardName} numberOfLines={1}>{product.modelName}</Text>
                  <Text style={st.cardMeta}>
                    {product.totalGrams.toFixed(0)}g • {product.pieceCount} adet • {dateStr}
                    {product.customerName ? ` • 👤 ${product.customerName}` : ''}
                  </Text>
                </View>
                <View style={st.cardRight}>
                  <Text style={st.cardPrice}>{product.unitSalePrice.toFixed(2)}</Text>
                  <Text style={st.cardPriceCurrency}>₺/adet</Text>
                </View>
                <Text style={st.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* ─── Expanded Detail ─── */}
              {isExpanded && (
                <View style={st.detailPanel}>
                  {/* Order Info */}
                  {(product.customerName || product.modelUrl) && (
                    <View style={{ marginBottom: 12 }}>
                      {product.customerName && (
                        <View style={st.detailInfoRow}>
                          <Text style={st.detailInfoLabel}>👤 Kişi/Müşteri</Text>
                          <Text style={st.detailInfoValue}>{product.customerName}</Text>
                        </View>
                      )}
                      {product.modelUrl && (
                        <TouchableOpacity onPress={() => Linking.openURL(product.modelUrl!)} activeOpacity={0.7} style={[st.detailInfoRow, { marginTop: 2 }]}>
                          <Text style={st.detailInfoLabel}>🔗 Kaynak Linki</Text>
                          <Text style={{ color: COLORS.accentLight, textDecorationLine: 'underline', fontWeight: '600', fontSize: 13 }}>Siteye Git ↗</Text>
                        </TouchableOpacity>
                      )}
                      <View style={[st.detailDivider, { marginTop: 12, marginBottom: 4 }]} />
                    </View>
                  )}

                  {/* Filament Details */}
                  <Text style={st.detailTitle}>🎨 Filament Detayları</Text>
                  {product.filaments.map((f, i) => (
                    <View key={i} style={st.detailRow}>
                      <View style={[st.detailDot, { backgroundColor: TYPE_COLORS[f.filamentType] || COLORS.accent }]} />
                      <Text style={st.detailLabel} numberOfLines={1}>
                        {f.filamentName}
                      </Text>
                      <Text style={st.detailGrams}>{f.grams}g</Text>
                      <Text style={st.detailCost}>
                        {(f.grams * (f.pricePerKg / 1000)).toFixed(2)} ₺
                      </Text>
                    </View>
                  ))}

                  {/* Print Info */}
                  <View style={st.detailDivider} />
                  <View style={st.detailInfoRow}>
                    <Text style={st.detailInfoLabel}>⏱️ Süre</Text>
                    <Text style={st.detailInfoValue}>
                      {product.hours}sa {product.minutes}dk
                    </Text>
                  </View>
                  <View style={st.detailInfoRow}>
                    <Text style={st.detailInfoLabel}>📈 Kâr Türü</Text>
                    <Text style={st.detailInfoValue}>
                      {product.profitType === 'percentage' ? `+%${product.profitMultiplier}` : `×${product.profitMultiplier || 1}`}
                    </Text>
                  </View>
                  {product.extraCosts > 0 && (
                    <View style={st.detailInfoRow}>
                      <Text style={st.detailInfoLabel}>📦 Ekstra</Text>
                      <Text style={st.detailInfoValue}>{product.extraCosts} ₺</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={st.actionRow}>
                    <TouchableOpacity
                      style={st.actionBtnRecalc}
                      onPress={() => handleRecalc(product.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={st.actionBtnRecalcText}>🔄 Yeniden Hesapla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={st.actionBtnLoad}
                      onPress={() => handleLoadToCalc(product)}
                      activeOpacity={0.8}
                    >
                      <Text style={st.actionBtnLoadText}>📥 Hesap Makinesine Yükle</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={st.actionBtnDelete}
                    onPress={() => handleDelete(product.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={st.actionBtnDeleteText}>🗑️ Sil</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnText: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Empty
  emptyState: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 40, alignItems: 'center', marginTop: 60,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  // Search & Sort
  searchSortContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 48, marginBottom: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '500' },
  clearSearchBtn: { padding: 4 },
  clearSearchText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '800' },
  sortChipContainer: { gap: 8, paddingBottom: 10 },
  sortChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sortChipActive: { backgroundColor: 'rgba(74,105,189,0.15)', borderColor: COLORS.accent },
  sortChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  sortChipTextActive: { color: COLORS.accentLight, fontWeight: '700' },

  // Compact card
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  cardExpanded: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', marginRight: 10 },
  cardPrice: { fontSize: 22, fontWeight: '800', color: COLORS.priceCard },
  cardPriceCurrency: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 1 },
  expandArrow: { fontSize: 10, color: COLORS.textMuted },

  // Detail panel
  detailPanel: {
    backgroundColor: COLORS.surfaceLight, borderWidth: 1,
    borderTopWidth: 0, borderColor: COLORS.border,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    padding: 20,
  },
  detailTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.text,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, gap: 8,
  },
  detailDot: { width: 8, height: 8, borderRadius: 4 },
  detailLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  detailGrams: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginRight: 8 },
  detailCost: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  detailInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailInfoLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  detailInfoValue: { fontSize: 13, color: COLORS.text, fontWeight: '700' },

  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtnRecalc: {
    flex: 1, backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)',
  },
  actionBtnRecalcText: { color: COLORS.priceCard, fontSize: 14, fontWeight: '700' },
  actionBtnLoad: {
    flex: 1, backgroundColor: COLORS.accent,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  actionBtnLoadText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionBtnDelete: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    marginTop: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  actionBtnDeleteText: { color: COLORS.danger, fontSize: 14, fontWeight: '700' },
});
