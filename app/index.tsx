import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  LayoutAnimation,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { CustomAlert, CustomAlertButton } from '../components/ui/CustomAlert';
import { ActionMenu } from '../components/ui/ActionMenu';

const { width } = Dimensions.get('window');
const DEFAULT_HOURLY_COST = 5;
const DEFAULT_SERVICE_FEE = 0;

const STORAGE_KEYS = {
  inputs: '@print_calc_inputs',
  inventory: '@print_calc_inventory',
  hourlyCost: '@print_calc_hourly',
  serviceFee: '@print_calc_service_fee',
  catalog: '@print_calc_catalog',
};

// ─── Types ────────────────────────────────────────────
interface FilamentItem {
  id: string;
  name?: string;
  brand?: string;
  color?: string;
  hexColor?: string;
  isFavorite?: boolean;
  isActive?: boolean;
  type: string;
  price?: number;
  weightGrams?: number;
  pricePerKg: number;
  stockGrams?: number;
}

/** Ensure pricePerKg is always correct, whether old or new format */
function normalizeItem(raw: any): FilamentItem {
  const weightGrams = raw.weightGrams ?? 1000;
  const price = raw.price ?? raw.pricePerKg ?? 0;
  return {
    ...raw,
    brand: raw.brand,
    color: raw.color,
    hexColor: raw.hexColor,
    isFavorite: raw.isFavorite ?? false,
    isActive: raw.isActive !== false,
    price,
    weightGrams,
    pricePerKg: (price / weightGrams) * 1000,
  };
}

interface FilamentUsage {
  rowId: string;
  filamentId: string;
  grams: string;
}

interface InputState {
  hours: string;
  minutes: string;
  profitMultiplier: string;
  profitType: 'multiplier' | 'percentage';
  extraCosts: string;
  pieceCount: string;
  filamentRows: FilamentUsage[];
}

const makeRow = (): FilamentUsage => ({
  rowId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
  filamentId: '',
  grams: '',
});

const DEFAULT_INPUTS: InputState = {
  hours: '',
  minutes: '',
  profitMultiplier: '2.5',
  profitType: 'multiplier',
  extraCosts: '',
  pieceCount: '1',
  filamentRows: [makeRow()],
};

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
  costCard: '#D66666',
  costCardBg: 'rgba(214, 102, 102, 0.12)',
  priceCard: '#4A90E2',
  priceCardBg: 'rgba(74, 144, 226, 0.12)',
  profitCard: '#48C78E',
  profitCardBg: 'rgba(72, 199, 142, 0.12)',
  unitCostCard: '#C87850',
  unitCostCardBg: 'rgba(200, 120, 80, 0.12)',
  unitPriceCard: '#4F6B99',
  unitPriceCardBg: 'rgba(79, 107, 153, 0.12)',
  unitProfitCard: '#4CB09E',
  unitProfitCardBg: 'rgba(76, 176, 158, 0.12)',
  serviceCard: '#D4A373',
  danger: '#D66666',
  success: '#48C78E',
  warning: '#D4A373',
};

const TYPE_COLORS: Record<string, string> = {
  PLA: '#4CAF50',
  PETG: '#2196F3',
  ABS: '#FF9800',
  ASA: '#F44336',
  TPU: '#9C27B0',
  Nylon: '#00BCD4',
  PC: '#795548',
  HIPS: '#607D8B',
};

// ─── Filament Picker Modal ────────────────────────────
interface PickerModalProps {
  visible: boolean;
  inventory: FilamentItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function FilamentPickerModal({ visible, inventory, selectedId, onSelect, onClose }: PickerModalProps) {
  const [search, setSearch] = useState('');
  
  // Accordion state
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const toggleType = (type: string) => setExpandedTypes((p) => ({ ...p, [type]: !p[type] }));
  const toggleBrand = (key: string) => setExpandedBrands((p) => ({ ...p, [key]: !p[key] }));

  const renderAccordionGroups = (groups: Record<string, Record<string, FilamentItem[]>>, prefix: string = '') => {
    return Object.keys(groups).sort().map(type => {
      const typeKey = `${prefix}${type}`;
      const typeExpanded = expandedTypes[typeKey];
      const brandsForType = groups[type];
      const brandKeys = Object.keys(brandsForType).sort();
      const totalInType = brandKeys.reduce((acc, bk) => acc + brandsForType[bk].length, 0);

      return (
        <View key={typeKey} style={pk.accTypeCard}>
          <TouchableOpacity style={pk.accTypeHeader} onPress={() => toggleType(typeKey)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{typeExpanded ? '▼' : '▶'}</Text>
              <Text style={pk.accTypeTitle}>{type}</Text>
              <View style={pk.accBadge}><Text style={pk.accBadgeText}>{totalInType}</Text></View>
            </View>
          </TouchableOpacity>
          
          {typeExpanded && (
            <View style={pk.accTypeContent}>
              {brandKeys.map(brand => {
                const brandKey = `${typeKey}_${brand}`;
                const brandExpanded = expandedBrands[brandKey];
                const items = brandsForType[brand];
                
                return (
                  <View key={brandKey} style={pk.accBrandCard}>
                    <TouchableOpacity style={pk.accBrandHeader} onPress={() => toggleBrand(brandKey)} activeOpacity={0.7}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>{brandExpanded ? '▼' : '▶'}</Text>
                        <Text style={pk.accBrandTitle}>{brand}</Text>
                        <View style={[pk.accBadge, { backgroundColor: COLORS.surfaceLight }]}><Text style={pk.accBadgeText}>{items.length}</Text></View>
                      </View>
                    </TouchableOpacity>
                    
                    {brandExpanded && (
                      <View style={pk.accBrandContent}>
                        {items.map(renderPickerItem)}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    });
  };

  const activeInventory = inventory.filter((f) => f.isActive !== false);

  // Filtered for search
  const searchFiltered = search ? activeInventory.filter((f) => {
    const displayName = f.brand && f.color ? `${f.brand} - ${f.color}` : (f.name || '');
    return displayName.toLowerCase().includes(search.toLowerCase());
  }) : [];

  // Grouped for accordion (when no search)
  const favorites = activeInventory.filter((f) => f.isFavorite);

  const groupedInventory = activeInventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = {};
    const brand = item.brand || 'Diğer';
    if (!acc[item.type][brand]) acc[item.type][brand] = [];
    acc[item.type][brand].push(item);
    return acc;
  }, {} as Record<string, Record<string, FilamentItem[]>>);

  const groupedFavorites = favorites.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = {};
    const brand = item.brand || 'Diğer';
    if (!acc[item.type][brand]) acc[item.type][brand] = [];
    acc[item.type][brand].push(item);
    return acc;
  }, {} as Record<string, Record<string, FilamentItem[]>>);

  useEffect(() => {
    if (visible) { setSearch(''); }
  }, [visible]);

  const renderPickerItem = (item: FilamentItem) => {
    const isSel = item.id === selectedId;
    const displayName = item.brand && item.color ? `${item.brand} - ${item.color}` : (item.name || '');
    const dotColor = item.hexColor || TYPE_COLORS[item.type] || COLORS.accent;
    return (
      <TouchableOpacity key={item.id} style={[pk.item, isSel && pk.itemActive]} onPress={() => { onSelect(item.id); onClose(); }} activeOpacity={0.7}>
        <View style={[pk.itemDot, { backgroundColor: dotColor }]} />
        <View style={pk.itemInfo}>
          <Text style={[pk.itemName, isSel && pk.itemNameActive]} numberOfLines={1}>{displayName}</Text>
          <Text style={pk.itemMeta}>{item.type} • {item.pricePerKg?.toFixed(0)} ₺/kg • Stok: {item.stockGrams ?? item.weightGrams ?? 1000}g</Text>
        </View>
        {isSel && <Text style={pk.itemCheck}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pk.overlay}>
        <TouchableOpacity style={pk.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View style={pk.sheet}>
          <View style={pk.handle} />
          <View style={pk.header}>
            <Text style={pk.headerTitle}>🧵 Filament Seç</Text>
            <TouchableOpacity onPress={onClose} style={pk.closeBtn} activeOpacity={0.7}>
              <Text style={pk.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={pk.searchWrap}>
            <Text style={pk.searchIcon}>🔍</Text>
            <TextInput
              style={pk.searchInput}
              placeholder="Marka veya renk ara..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                <Text style={pk.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {search.length > 0 ? (
            <>
              <Text style={pk.resultCount}>{searchFiltered.length} filament bulundu</Text>
              <ScrollView style={pk.listScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {searchFiltered.length === 0 && (
                  <View style={pk.emptyResult}><Text style={pk.emptyText}>Sonuç bulunamadı</Text></View>
                )}
                {searchFiltered.map(renderPickerItem)}
                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          ) : (
            <ScrollView style={[pk.listScroll, { marginTop: 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Favorites Accordion */}
              {favorites.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.warning, marginBottom: 8, paddingLeft: 4 }}>
                    ⭐ Sık Kullanılanlar
                  </Text>
                  {renderAccordionGroups(groupedFavorites, 'fav_')}
                </View>
              )}

              {/* Accordion Categories */}
              {renderAccordionGroups(groupedInventory)}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  overlayTouch: { flex: 1 },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.border },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: 12, marginHorizontal: 20, height: 44, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border, gap: 10 },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text, height: '100%' },
  clearBtn: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700', padding: 4 },
  chipScroll: { maxHeight: 48, marginTop: 12 },
  chipContent: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(108,92,231,0.15)' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.accentLight },
  resultCount: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', paddingHorizontal: 20, marginTop: 10, marginBottom: 6 },
  listScroll: { paddingHorizontal: 20 },
  brandHeader: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 6, paddingLeft: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  itemActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(108,92,231,0.10)' },
  itemDot: { width: 12, height: 12, borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  itemNameActive: { color: COLORS.accentLight },
  itemMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  itemCheck: { fontSize: 18, color: COLORS.accent, fontWeight: '700' },
  emptyResult: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
  accTypeCard: { backgroundColor: COLORS.surface, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  accTypeHeader: { padding: 14, backgroundColor: COLORS.surfaceLight, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  accTypeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  accTypeContent: { padding: 10, backgroundColor: COLORS.bg },
  accBrandCard: { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  accBrandHeader: { padding: 10, backgroundColor: COLORS.surface },
  accBrandTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, flex: 1 },
  accBrandContent: { padding: 6, backgroundColor: COLORS.surfaceLight, borderTopWidth: 1, borderTopColor: COLORS.border },
  accBadge: { backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  accBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
});

// ─── FilamentRow Component ────────────────────────────
interface FilamentRowProps {
  row: FilamentUsage;
  inventory: FilamentItem[];
  onUpdate: (rowId: string, field: 'filamentId' | 'grams', value: string) => void;
  onDelete: (rowId: string) => void;
  canDelete: boolean;
  index: number;
}

function FilamentRow({ row, inventory, onUpdate, onDelete, canDelete, index }: FilamentRowProps) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedFilament = inventory.find((f) => f.id === row.filamentId);

  return (
    <View style={rowStyles.wrapper}>
      <FilamentPickerModal
        visible={showPicker}
        inventory={inventory}
        selectedId={row.filamentId}
        onSelect={(id) => onUpdate(row.rowId, 'filamentId', id)}
        onClose={() => setShowPicker(false)}
      />
      <View style={rowStyles.header}>
        <View style={rowStyles.indexBadge}>
          <Text style={rowStyles.indexText}>{index + 1}</Text>
        </View>
        <Text style={rowStyles.headerLabel}>Filament {index + 1}</Text>
        {canDelete && (
          <TouchableOpacity style={rowStyles.deleteBtn} onPress={() => onDelete(row.rowId)} activeOpacity={0.7}>
            <Text style={rowStyles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {inventory.length === 0 ? (
        <View style={rowStyles.emptyNote}>
          <Text style={rowStyles.emptyNoteText}>⚠️ Envanter boş — Ayarlardan filament ekle</Text>
        </View>
      ) : (
        <TouchableOpacity style={rowStyles.selector} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          {selectedFilament ? (
            <View style={rowStyles.selectorInner}>
              <View style={[rowStyles.dot, { backgroundColor: TYPE_COLORS[selectedFilament.type] || COLORS.accent }]} />
              <View style={rowStyles.selectorInfo}>
                <Text style={rowStyles.selectorName} numberOfLines={1}>
                  {selectedFilament.brand && selectedFilament.color ? `${selectedFilament.brand} - ${selectedFilament.color}` : selectedFilament.name}
                </Text>
                <Text style={rowStyles.selectorMeta}>{selectedFilament.type} • {selectedFilament.pricePerKg?.toFixed(0)} ₺/kg • Stok: {selectedFilament.stockGrams ?? selectedFilament.weightGrams ?? 1000}g</Text>
              </View>
            </View>
          ) : (
            <Text style={rowStyles.selectorPlaceholder}>Filament seçin...</Text>
          )}
          <Text style={rowStyles.arrow}>▼</Text>
        </TouchableOpacity>
      )}
      <View style={rowStyles.gramRow}>
        <TextInput style={rowStyles.gramInput} placeholder="Gram miktarı..." placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={row.grams} onChangeText={(v) => onUpdate(row.rowId, 'grams', v.replace(/[^0-9.]/g, ''))} />
        <View style={rowStyles.gramBadge}><Text style={rowStyles.gramBadgeText}>gram</Text></View>
        {selectedFilament && row.grams ? (
          <View style={rowStyles.costPreview}>
            <Text style={rowStyles.costPreviewText}>{((parseFloat(row.grams) || 0) * (selectedFilament.pricePerKg / 1000)).toFixed(2)} ₺</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  wrapper: { backgroundColor: COLORS.surfaceLight, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  indexBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  indexText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  headerLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, flex: 1 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  emptyNote: { backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 10 },
  emptyNoteText: { color: COLORS.costCard, fontSize: 13, fontWeight: '600' },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bg, borderRadius: 12, height: 52, paddingHorizontal: 16, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 10 },
  selectorInner: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  selectorInfo: { flex: 1 },
  selectorName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  selectorMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  selectorPlaceholder: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  arrow: { fontSize: 10, color: COLORS.textMuted, marginLeft: 8 },
  gramRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gramInput: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, fontWeight: '600', color: COLORS.text, borderWidth: 1.5, borderColor: COLORS.border },
  gramBadge: { backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 16, height: 52, justifyContent: 'center', alignItems: 'center' },
  gramBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  costPreview: { backgroundColor: 'rgba(79,70,229,0.12)', borderRadius: 10, paddingHorizontal: 14, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,70,229,0.2)' },
  costPreviewText: { color: COLORS.accentLight, fontSize: 14, fontWeight: '800' },
});

// ─── Main Screen ─────────────────────────────────────
export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [inputs, setInputs] = useState<InputState>(DEFAULT_INPUTS);
  const [inventory, setInventory] = useState<FilamentItem[]>([]);
  const [hourlyCost, setHourlyCost] = useState<number>(DEFAULT_HOURLY_COST);
  const [serviceFee, setServiceFee] = useState<number>(DEFAULT_SERVICE_FEE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogModelName, setCatalogModelName] = useState('');

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons: CustomAlertButton[] }>({
    visible: false, title: '', message: '', buttons: []
  });

  const showAlert = (title: string, message: string, buttons: CustomAlertButton[] = [{ text: 'Tamam', style: 'cancel' }]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));
  const [catalogCustomerName, setCatalogCustomerName] = useState('');
  const [catalogModelUrl, setCatalogModelUrl] = useState('');
  const [isPrintInfoOpen, setIsPrintInfoOpen] = useState(true);
  const [isSalesInfoOpen, setIsSalesInfoOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'sale' | 'cost'>('sale');

  const toggleMainSection = (section: 'print' | 'sales' | 'result') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'print') setIsPrintInfoOpen(!isPrintInfoOpen);
    if (section === 'sales') setIsSalesInfoOpen(!isSalesInfoOpen);
    if (section === 'result') setIsResultOpen(!isResultOpen);
  };

  // ─── Load ─────────────────────────────────────────
  useEffect(() => {
    loadAllData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadAllOnFocus();
    }, [])
  );

  const loadAllData = async () => {
    try {
      const [savedInputs, savedInventory, savedHourly, savedFee] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.inputs),
        AsyncStorage.getItem(STORAGE_KEYS.inventory),
        AsyncStorage.getItem(STORAGE_KEYS.hourlyCost),
        AsyncStorage.getItem(STORAGE_KEYS.serviceFee),
      ]);
      if (savedInputs) {
        const parsed = JSON.parse(savedInputs) as InputState;
        if (!parsed.filamentRows || parsed.filamentRows.length === 0) {
          parsed.filamentRows = [makeRow()];
        }
        setInputs(parsed);
      }
      if (savedInventory) setInventory((JSON.parse(savedInventory) as any[]).map(normalizeItem));
      if (savedHourly) setHourlyCost(JSON.parse(savedHourly));
      if (savedFee) setServiceFee(JSON.parse(savedFee));
    } catch (e) {
      console.log('Load error:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const reloadAllOnFocus = async () => {
    try {
      const [savedInputs, savedInventory, savedHourly, savedFee] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.inputs),
        AsyncStorage.getItem(STORAGE_KEYS.inventory),
        AsyncStorage.getItem(STORAGE_KEYS.hourlyCost),
        AsyncStorage.getItem(STORAGE_KEYS.serviceFee),
      ]);
      if (savedInputs) {
        const parsed = JSON.parse(savedInputs) as InputState;
        if (!parsed.filamentRows || parsed.filamentRows.length === 0) {
          parsed.filamentRows = [makeRow()];
        }
        setInputs(parsed);
      }
      if (savedInventory) setInventory((JSON.parse(savedInventory) as any[]).map(normalizeItem));
      if (savedHourly) setHourlyCost(JSON.parse(savedHourly));
      if (savedFee) setServiceFee(JSON.parse(savedFee));
    } catch (e) {
      console.log('Reload error:', e);
    }
  };

  // ─── Auto-save ───────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    const timeout = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEYS.inputs, JSON.stringify(inputs));
    }, 400);
    return () => clearTimeout(timeout);
  }, [inputs, isLoaded]);

  // ─── Input handlers ───────────────────────────────
  const updateInput = (key: keyof Omit<InputState, 'filamentRows'>, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const addFilamentRow = () => {
    setInputs((prev) => ({
      ...prev,
      filamentRows: [...prev.filamentRows, makeRow()],
    }));
  };

  const deleteFilamentRow = (rowId: string) => {
    setInputs((prev) => ({
      ...prev,
      filamentRows: prev.filamentRows.filter((r) => r.rowId !== rowId),
    }));
  };

  const updateFilamentRow = (rowId: string, field: 'filamentId' | 'grams', value: string) => {
    setInputs((prev) => ({
      ...prev,
      filamentRows: prev.filamentRows.map((r) =>
        r.rowId === rowId ? { ...r, [field]: value } : r
      ),
    }));
  };

  // ─── Calculations ─────────────────────────────────
  const hours = parseFloat(inputs.hours) || 0;
  const minutes = parseFloat(inputs.minutes) || 0;
  const totalHours = hours + minutes / 60;
  const multiplier = parseFloat(inputs.profitMultiplier) || 1;
  const extras = parseFloat(inputs.extraCosts) || 0;
  const pieces = Math.max(1, parseInt(inputs.pieceCount) || 1);

  // Multi-filament cost
  const filamentCost = inputs.filamentRows.reduce((sum, row) => {
    const fil = inventory.find((f) => f.id === row.filamentId);
    if (!fil) return sum;
    const grams = parseFloat(row.grams) || 0;
    return sum + grams * (fil.pricePerKg / 1000);
  }, 0);

  const totalGrams = inputs.filamentRows.reduce(
    (sum, row) => sum + (parseFloat(row.grams) || 0),
    0
  );

  const timeCost = totalHours * hourlyCost;
  const isPercentage = inputs.profitType === 'percentage';
  const filamentSalePrice = isPercentage
    ? filamentCost * (1 + (multiplier / 100))
    : filamentCost * multiplier; // Kârlı filament bedeli
  const totalCost = filamentCost + timeCost + extras + serviceFee;  // Gerçek maliyet
  const salePrice = filamentSalePrice + timeCost + serviceFee + extras; // Satış fiyatı
  const netProfit = salePrice - totalCost;                          // Net kâr

  const unitCost = totalCost / pieces;
  const unitSalePrice = salePrice / pieces;
  const unitProfit = unitSalePrice - unitCost;
  const isBatch = pieces > 1;

  // Active filament count for info bar
  const activeFilaments = inputs.filamentRows.filter((r) => r.filamentId && r.grams).length;

  // ─── Confirm Production & Deduct Stock ──────────────
  const confirmProduction = async () => {
    const rowsWithFilament = inputs.filamentRows.filter((r) => r.filamentId && r.grams);
    if (rowsWithFilament.length === 0) {
      showAlert('Uyarı', 'Stoktan düşülecek filament bilgisi yok.\nLütfen en az bir filament ve gram girin.');
      return;
    }

    const issues: string[] = [];
    for (const row of rowsWithFilament) {
      const fil = inventory.find((f) => f.id === row.filamentId);
      if (!fil) continue;
      const usedGrams = parseFloat(row.grams) || 0;
      const currentStock = fil.stockGrams ?? fil.weightGrams ?? 1000;
      if (usedGrams > currentStock) {
        const displayName = fil.brand && fil.color ? `${fil.brand} - ${fil.color}` : (fil.name || 'Bilinmeyen');
        issues.push(`${displayName}: ${usedGrams}g isteniyor, stokta ${currentStock}g var.`);
      }
    }

    const proceedWithProduction = async (archiveInsufficient: boolean) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.inventory);
        if (!raw) return;
        const storedList: any[] = JSON.parse(raw);

        for (const row of rowsWithFilament) {
          const usedGrams = parseFloat(row.grams) || 0;
          const idx = storedList.findIndex((f) => f.id === row.filamentId);
          if (idx >= 0) {
            const currentStock = storedList[idx].stockGrams ?? storedList[idx].weightGrams ?? 1000;
            const newStock = Math.max(0, currentStock - usedGrams);
            storedList[idx].stockGrams = newStock;
            
            if (usedGrams > currentStock) {
              if (archiveInsufficient) {
                storedList[idx].isActive = false;
              }
            } else {
              if (newStock <= 0) {
                storedList[idx].isActive = false;
              }
            }
          }
        }

        await AsyncStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(storedList));
        setInventory(storedList.map(normalizeItem));
        
        if (archiveInsufficient && issues.length > 0) {
          showAlert('✅ Üretim Kaydedildi', 'Stok düşüldü ve yetersiz olanlar arşive alındı.');
        } else {
          showAlert('✅ Üretim Kaydedildi', 'Filament stokları başarıyla düşüldü.');
        }
      } catch (e) {
        showAlert('Hata', 'Stok güncellenemedi.');
      }
    };

    if (issues.length > 0) {
      showAlert(
        'Yeterli filament yok',
        issues.join('\n') + '\n\nNe yapılmasını istersiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Stoktan Düş', onPress: () => proceedWithProduction(false) },
          { text: 'Arşive Al', onPress: () => proceedWithProduction(true) }
        ]
      );
      return;
    }

    showAlert(
      '📦 Üretimi Onayla',
      `${rowsWithFilament.length} filamentten toplam ${totalGrams.toFixed(0)}g stoktan düşülecek.\n\nOnaylıyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onayla & Düş', onPress: () => proceedWithProduction(true) }
      ]
    );
  };

  // ─── Save to Catalog ──────────────────────────────
  const openCatalogSave = () => {
    if (activeFilaments === 0) {
      showAlert('Uyarı', 'Lütfen en az bir filament ve gram bilgisi girin.');
      return;
    }
    setCatalogModelName('');
    setCatalogCustomerName('');
    setCatalogModelUrl('');
    setShowCatalogModal(true);
  };

  const confirmCatalogSave = async () => {
    if (!catalogModelName.trim()) {
      showAlert('Uyarı', 'Obje Adı boş olamaz.');
      return;
    }
    const product = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      modelName: catalogModelName.trim(),
      customerName: catalogCustomerName.trim() || undefined,
      modelUrl: catalogModelUrl.trim() || undefined,
      createdAt: Date.now(),
      filaments: inputs.filamentRows
        .filter((r) => r.filamentId && r.grams)
        .map((r) => {
          const fil = inventory.find((f) => f.id === r.filamentId);
          return {
            filamentId: r.filamentId,
            filamentName: fil ? (fil.brand && fil.color ? `${fil.brand} - ${fil.color}` : (fil.name || 'Bilinmeyen')) : 'Bilinmeyen',
            filamentType: fil?.type ?? '?',
            grams: parseFloat(r.grams) || 0,
            pricePerKg: fil?.pricePerKg ?? 0,
          };
        }),
      pieceCount: pieces,
      hours,
      minutes: parseFloat(inputs.minutes) || 0,
      profitMultiplier: multiplier,
      profitType: inputs.profitType || 'multiplier',
      extraCosts: extras,
      totalGrams,
      unitSalePrice: isBatch ? unitSalePrice : salePrice,
    };
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.catalog);
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(product);
      await AsyncStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(existing));
      setShowCatalogModal(false);
      showAlert('✅ Kaydedildi', `'${catalogModelName.trim()}' kataloğa eklendi!`);
    } catch (e) {
      showAlert('Hata', 'Katalog kaydedilemedi.');
    }
  };

  if (!isLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ─── Custom Alert Modal ─── */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onRequestClose={closeAlert}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Catalog Name Modal ───────────────── */}
        <Modal visible={showCatalogModal} transparent animationType="fade" onRequestClose={() => setShowCatalogModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>📋 Kataloğa Kaydet</Text>
              <Text style={styles.modalSubtitle}>Kişisel fiyat hafızanız için sipariş detaylarını girin.</Text>
              
              <Text style={styles.modalLabel}>Obje Adı <Text style={{color: COLORS.danger}}>*</Text></Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Örn: Kristal Ejderha"
                placeholderTextColor={COLORS.textMuted}
                value={catalogModelName}
                onChangeText={setCatalogModelName}
                autoFocus
              />

              <Text style={styles.modalLabel}>Kimin İçin Yapılıyor? (Opsiyonel)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Örn: Ahmet, Ayşe"
                placeholderTextColor={COLORS.textMuted}
                value={catalogCustomerName}
                onChangeText={setCatalogCustomerName}
              />

              <Text style={styles.modalLabel}>Obje Linki (Opsiyonel)</Text>
              <TextInput
                style={[styles.modalInput, { marginBottom: 24 }]}
                placeholder="Örn: https://makerworld.com/..."
                placeholderTextColor={COLORS.textMuted}
                value={catalogModelUrl}
                onChangeText={setCatalogModelUrl}
                keyboardType="url"
                autoCapitalize="none"
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCatalogModal(false)} activeOpacity={0.7}>
                  <Text style={styles.modalCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={confirmCatalogSave} activeOpacity={0.8}>
                  <Text style={styles.modalSaveText}>💾 Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* ─── Header ───────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>🖨️</Text>
            <View>
              <Text style={styles.headerTitle}>3D Baskı</Text>
              <Text style={styles.headerSubtitle}>Maliyet Hesaplayıcı</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <ActionMenu />
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Info Bar ─────────────────────────────── */}
        <View style={styles.infoBar}>
          <Text style={styles.infoBarText}>
            {activeFilaments > 0
              ? `🎨 ${activeFilaments} renk • ${totalGrams.toFixed(0)} gram toplam • Saatlik: ${hourlyCost} ₺`
              : `Filament eklenmedi • Saatlik: ${hourlyCost} ₺`}
            {serviceFee > 0 ? ` • Hizmet: ${serviceFee} ₺` : ''}
          </Text>
        </View>
        {/* ─── Menu 1: Baskı Bilgileri ──────────────── */}
        <TouchableOpacity style={styles.mainAccHeader} onPress={() => toggleMainSection('print')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainAccTitle}>⏱️ Baskı Bilgileri</Text>
            <Text style={styles.mainAccHint}>Baskı süresi ve kullanılan filamentleri girin</Text>
          </View>
          <View style={styles.mainAccIconBg}>
            <Text style={styles.mainAccIcon}>{isPrintInfoOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isPrintInfoOpen && (
        <View style={styles.mainAccContent}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>⏱️ Baskı Süresi</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <TextInput
                style={styles.timeInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={inputs.hours}
                onChangeText={(v) => updateInput('hours', v.replace(/[^0-9]/g, ''))}
                maxLength={3}
              />
              <Text style={styles.timeLabel}>Saat</Text>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeInputGroup}>
              <TextInput
                style={styles.timeInput}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={inputs.minutes}
                onChangeText={(v) => {
                  const num = v.replace(/[^0-9]/g, '');
                  if (parseInt(num) <= 59 || num === '') updateInput('minutes', num);
                }}
                maxLength={2}
              />
              <Text style={styles.timeLabel}>Dakika</Text>
            </View>
          </View>
        </View>

        {/* ─── Multi Filament Section ───────────────── */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Text style={styles.cardLabel}>🎨 Kullanılan Filamentler</Text>
            <View style={styles.rowCountBadge}>
              <Text style={styles.rowCountText}>{inputs.filamentRows.length}</Text>
            </View>
          </View>
          <Text style={styles.cardHint}>
            Her renk/filament için ayrı satır ekleyin
          </Text>

          {inputs.filamentRows.map((row, index) => (
            <FilamentRow
              key={row.rowId}
              row={row}
              inventory={inventory}
              index={index}
              canDelete={inputs.filamentRows.length > 1}
              onUpdate={updateFilamentRow}
              onDelete={deleteFilamentRow}
            />
          ))}
          <TouchableOpacity
            style={styles.addRowBtn}
            onPress={addFilamentRow}
            activeOpacity={0.8}
          >
            <Text style={styles.addRowBtnText}>＋ Renk / Filament Ekle</Text>
          </TouchableOpacity>
        </View>
        </View>
        )}

        {/* ─── Menu 2: Satış & Detaylar ─────────────── */}
        <TouchableOpacity style={styles.mainAccHeader} onPress={() => toggleMainSection('sales')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainAccTitle}>📈 Satış & Detaylar</Text>
            <Text style={styles.mainAccHint}>Ürün sayısı, kâr marjı ve ekstra maliyetler</Text>
          </View>
          <View style={styles.mainAccIconBg}>
            <Text style={styles.mainAccIcon}>{isSalesInfoOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isSalesInfoOpen && (
        <View style={styles.mainAccContent}>

        {/* ─── Piece Count ──────────────────────────── */}
        <View style={[styles.card, isBatch && styles.cardHighlight]}>
          <Text style={styles.cardLabel}>🔢 Tabladaki Ürün Sayısı</Text>
          <Text style={styles.cardHint}>
            Tablaya kaç adet ürün dizdiğinizi girin (seri üretim için)
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="1"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={inputs.pieceCount}
              onChangeText={(v) => updateInput('pieceCount', v.replace(/[^0-9]/g, ''))}
              maxLength={4}
            />
            <View style={[styles.unitBadge, isBatch && { backgroundColor: COLORS.serviceCard }]}>
              <Text style={[styles.unitText, isBatch && { color: '#1a1a2e' }]}>adet</Text>
            </View>
          </View>
          {isBatch && (
            <View style={styles.batchInfoBar}>
              <Text style={styles.batchInfoText}>
                📐 Seri modu aktif — Sabit maliyetler {pieces} ürüne bölünüyor
              </Text>
            </View>
          )}
        </View>

        {/* ─── Material Profit Multiplier ─────────────── */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.cardLabel, { marginBottom: 0 }]}>📈 Malzeme Kârı</Text>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border }}
              onPress={() => updateInput('profitType', inputs.profitType === 'multiplier' ? 'percentage' : 'multiplier')}
            >
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' }}>
                Mod: {inputs.profitType === 'percentage' ? 'Yüzde (%)' : 'Çarpan (×)'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardHint}>
            Sadece filament maliyetine uygulanır 
            {inputs.profitType === 'percentage' ? ' (Örn: 50 = %50 kâr)' : ' (Örn: 2.5× = %150 kâr)'}
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder={inputs.profitType === 'percentage' ? 'Örn: 50' : 'Örn: 2.5'}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={inputs.profitMultiplier}
              onChangeText={(v) => updateInput('profitMultiplier', v.replace(/[^0-9.]/g, ''))}
            />
            <TouchableOpacity 
              style={[styles.unitBadge, { backgroundColor: COLORS.accent, paddingHorizontal: 16 }]}
              activeOpacity={0.8}
              onPress={() => updateInput('profitType', inputs.profitType === 'multiplier' ? 'percentage' : 'multiplier')}
            >
              <Text style={[styles.unitText, { color: '#1a1a2e', fontSize: 16 }]}>
                {inputs.profitType === 'percentage' ? '%' : '×'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Extra Costs ──────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📦 Ekstra Maliyetler</Text>
          <Text style={styles.cardHint}>Kutu, kargo, bant vb. (Opsiyonel)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={inputs.extraCosts}
              onChangeText={(v) => updateInput('extraCosts', v.replace(/[^0-9.]/g, ''))}
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>₺</Text>
            </View>
          </View>
        </View>

        </View>
        )}

        {/* ─── Menu 3: Sonuçlar & Hesaplama ─────────── */}
        <TouchableOpacity style={styles.mainAccHeader} onPress={() => toggleMainSection('result')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainAccTitle}>📦 Sonuçlar & Hesaplama</Text>
            <Text style={styles.mainAccHint}>
              {isBatch ? `Toplam: ${salePrice.toFixed(2)} ₺ • Birim: ${unitSalePrice.toFixed(2)} ₺` : `Satış Fiyatı: ${salePrice.toFixed(2)} ₺`}
            </Text>
          </View>
          <View style={styles.mainAccIconBg}>
            <Text style={styles.mainAccIcon}>{isResultOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isResultOpen && (
        <View style={styles.mainAccContent}>
          {/* Common Hero (Birim Satış Fiyatı) */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>BİRİM SATIŞ FİYATI</Text>
            <View style={styles.heroValueContainer}>
              <Text style={styles.heroValue}>{unitSalePrice.toFixed(2)}</Text>
              <Text style={styles.heroCurrency}>₺</Text>
            </View>
            {isBatch && (
              <Text style={styles.heroBatchText}>
                Tüm Tabla ({pieces} adet): {salePrice.toFixed(2)} ₺
              </Text>
            )}
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity 
              style={[styles.segmentBtn, activeResultTab === 'sale' && styles.segmentBtnActive]}
              onPress={() => setActiveResultTab('sale')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, activeResultTab === 'sale' && styles.segmentTextActive]}>
                🏷️ Satış & Kâr
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentBtn, activeResultTab === 'cost' && styles.segmentBtnActive]}
              onPress={() => setActiveResultTab('cost')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, activeResultTab === 'cost' && styles.segmentTextActive]}>
                📉 Maliyet Analizi
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content: Sale */}
          {activeResultTab === 'sale' && (
            <View>
              {/* Info Row */}
              <View style={styles.infoRowBar}>
                <Text style={styles.infoRowText}>
                  Malzeme Kârı: {inputs.profitType === 'percentage' ? `+%${multiplier}` : `×${multiplier}`}
                </Text>
              </View>

              {/* Grid 1: Total Sale & Net Profit (Tabla) */}
              <View style={styles.gridRow}>
                <View style={styles.modernCard}>
                  <View style={styles.modernCardHeader}>
                    <Text style={{ fontSize: 14 }}>🏷️</Text>
                    <Text style={styles.modernCardTitle}>Toplam Satış</Text>
                  </View>
                  <View style={styles.modernCardValueContainer}>
                    <Text style={[styles.modernCardValue, { color: COLORS.priceCard }]}>{salePrice.toFixed(2)}</Text>
                    <Text style={styles.modernCardCurrency}>₺</Text>
                  </View>
                </View>
                <View style={styles.modernCard}>
                  <View style={styles.modernCardHeader}>
                    <Text style={{ fontSize: 14 }}>🎯</Text>
                    <Text style={styles.modernCardTitle}>Net Kâr (Tabla)</Text>
                  </View>
                  <View style={styles.modernCardValueContainer}>
                    <Text style={[styles.modernCardValue, { color: COLORS.profitCard }]}>{netProfit.toFixed(2)}</Text>
                    <Text style={styles.modernCardCurrency}>₺</Text>
                  </View>
                </View>
              </View>

              {/* Grid 2: Unit Sale & Unit Profit (Only if Batch) */}
              {isBatch && (
                <View style={styles.gridRow}>
                  <View style={styles.modernCard}>
                    <View style={styles.modernCardHeader}>
                      <Text style={{ fontSize: 14 }}>📦</Text>
                      <Text style={styles.modernCardTitle}>Birim Satış</Text>
                    </View>
                    <View style={styles.modernCardValueContainer}>
                      <Text style={[styles.modernCardValue, { color: COLORS.priceCard }]}>{unitSalePrice.toFixed(2)}</Text>
                      <Text style={styles.modernCardCurrency}>₺</Text>
                    </View>
                  </View>
                  <View style={styles.modernCard}>
                    <View style={styles.modernCardHeader}>
                      <Text style={{ fontSize: 14 }}>✨</Text>
                      <Text style={styles.modernCardTitle}>Birim Kâr</Text>
                    </View>
                    <View style={styles.modernCardValueContainer}>
                      <Text style={[styles.modernCardValue, { color: COLORS.profitCard }]}>{unitProfit.toFixed(2)}</Text>
                      <Text style={styles.modernCardCurrency}>₺</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Tab Content: Cost */}
          {activeResultTab === 'cost' && (
            <View>
              <View style={styles.gridRow}>
                <View style={styles.modernCard}>
                  <View style={styles.modernCardHeader}>
                    <Text style={{ fontSize: 14 }}>💰</Text>
                    <Text style={styles.modernCardTitle}>Toplam Maliyet</Text>
                  </View>
                  <View style={styles.modernCardValueContainer}>
                    <Text style={[styles.modernCardValue, { color: COLORS.costCard }]}>{totalCost.toFixed(2)}</Text>
                    <Text style={styles.modernCardCurrency}>₺</Text>
                  </View>
                </View>
                {isBatch && (
                  <View style={styles.modernCard}>
                    <View style={styles.modernCardHeader}>
                      <Text style={{ fontSize: 14 }}>📏</Text>
                      <Text style={styles.modernCardTitle}>Birim Maliyet</Text>
                    </View>
                    <View style={styles.modernCardValueContainer}>
                      <Text style={[styles.modernCardValue, { color: COLORS.costCard }]}>{unitCost.toFixed(2)}</Text>
                      <Text style={styles.modernCardCurrency}>₺</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Maliyet Dağılımı List */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>📊 Maliyet Dağılımı</Text>

                {/* Per-filament breakdown */}
                {inputs.filamentRows.map((row) => {
                  const fil = inventory.find((f) => f.id === row.filamentId);
                  if (!fil || !row.grams) return null;
                  const cost = (parseFloat(row.grams) || 0) * (fil.pricePerKg / 1000);
                  return (
                    <View key={row.rowId} style={styles.breakdownRow}>
                      <View style={[styles.breakdownDot, { backgroundColor: TYPE_COLORS[fil.type] || COLORS.accent }]} />
                      <Text style={styles.breakdownLabel} numberOfLines={1}>
                        {fil.name} ({row.grams}g)
                      </Text>
                      <Text style={styles.breakdownValue}>{cost.toFixed(2)} ₺</Text>
                    </View>
                  );
                })}

                {filamentCost > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.accent }]} />
                    <Text style={[styles.breakdownLabel, { fontWeight: '600' }]}>
                      Toplam Filament (Maliyet)
                    </Text>
                    <Text style={[styles.breakdownValue, { color: COLORS.accentLight }]}>
                      {filamentCost.toFixed(2)} ₺
                    </Text>
                  </View>
                )}

                {filamentCost > 0 && ((!isPercentage && multiplier > 1) || (isPercentage && multiplier > 0)) && (
                  <View style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.priceCard }]} />
                    <Text style={[styles.breakdownLabel, { fontWeight: '700', color: COLORS.priceCard }]}>
                      Kârlı Filament ({isPercentage ? `+%${multiplier}` : `×${multiplier}`})
                    </Text>
                    <Text style={[styles.breakdownValue, { color: COLORS.priceCard, fontWeight: '700' }]}>
                      {filamentSalePrice.toFixed(2)} ₺
                    </Text>
                  </View>
                )}

                <View style={styles.breakdownDivider} />

                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={styles.breakdownLabel}>
                    Elektrik & Yıpranma ({totalHours.toFixed(1)} sa)
                  </Text>
                  <Text style={styles.breakdownValue}>{timeCost.toFixed(2)} ₺</Text>
                </View>

                {serviceFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.serviceCard }]} />
                    <Text style={styles.breakdownLabel}>🛠️ Hizmet/Başlatma Bedeli</Text>
                    <Text style={styles.breakdownValue}>{serviceFee.toFixed(2)} ₺</Text>
                  </View>
                )}

                {extras > 0 && (
                  <View style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: COLORS.textMuted }]} />
                    <Text style={styles.breakdownLabel}>Ekstra Maliyetler</Text>
                    <Text style={styles.breakdownValue}>{extras.toFixed(2)} ₺</Text>
                  </View>
                )}
              </View>
            </View>
          )}


        </View>
        )}

        {/* ─── Save to Catalog + Confirm Production + Reset ── */}
        <TouchableOpacity
          style={styles.catalogSaveBtn}
          onPress={openCatalogSave}
          activeOpacity={0.8}
        >
          <Text style={styles.catalogSaveBtnText}>📋 Kataloğa Kaydet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmProductionBtn}
          onPress={confirmProduction}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmProductionBtnText}>📦 Üretimi Onayla & Stoktan Düş</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setInputs(DEFAULT_INPUTS)}
          activeOpacity={0.7}
        >
          <Text style={styles.resetBtnText}>🔄 Sıfırla</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  loadingText: { color: COLORS.textSecondary, fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: COLORS.accentLight, fontWeight: '500', marginTop: -2 },
  settingsBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  settingsIcon: { fontSize: 22 },
  catalogBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(79,70,229,0.12)',
    borderWidth: 1, borderColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  catalogIcon: { fontSize: 22 },

  // Info bar
  infoBar: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  infoBarText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500', textAlign: 'center' },

  // Main Accordions
  mainAccHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainAccTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  mainAccHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingRight: 10,
  },
  mainAccIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAccIcon: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  mainAccContent: {
    marginBottom: 10,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  cardHighlight: { borderColor: COLORS.serviceCard, borderWidth: 1.5 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 10 },
  cardLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12, letterSpacing: 0.2 },
  cardHint: { fontSize: 11, color: COLORS.textMuted, marginTop: -8, marginBottom: 14 },
  rowCountBadge: {
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: 12,
  },
  rowCountText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Add row button
  addRowBtn: {
    backgroundColor: 'rgba(108,92,231,0.1)',
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', marginTop: 4,
    borderWidth: 1.5, borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  addRowBtnText: { color: COLORS.accentLight, fontSize: 14, fontWeight: '700' },

  // Time
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  timeInputGroup: { alignItems: 'center', flex: 1 },
  timeInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 16,
    height: 60, width: '100%', textAlign: 'center',
    fontSize: 30, fontWeight: '700', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  timeLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8, fontWeight: '500' },
  timeSeparator: { fontSize: 32, color: COLORS.accent, fontWeight: '700', marginBottom: 20 },

  // Piece count / batch
  batchInfoBar: {
    backgroundColor: 'rgba(253,203,110,0.08)',
    borderRadius: 10, padding: 10, marginTop: 12,
    borderWidth: 1, borderColor: 'rgba(253,203,110,0.2)',
  },
  batchInfoText: { fontSize: 12, color: COLORS.serviceCard, fontWeight: '600', textAlign: 'center' },

  // Generic inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight,
    borderRadius: 14, height: 52, paddingHorizontal: 16,
    fontSize: 18, fontWeight: '600', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  unitBadge: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingHorizontal: 16, height: 52,
    justifyContent: 'center', alignItems: 'center', minWidth: 60,
  },
  unitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Breakdown
  breakdownCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 20, marginBottom: 20, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 5,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  breakdownLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
  breakdownValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  breakdownDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },

  // Segmented Control
  segmentedControl: {
    flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 12,
    padding: 4, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surfaceLight, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  segmentTextActive: { color: COLORS.text, fontWeight: '700' },

  // Hero
  heroCard: {
    alignItems: 'center', marginBottom: 24, paddingVertical: 12,
  },
  heroLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  heroValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  heroValue: { fontSize: 48, fontWeight: '800', color: COLORS.text, letterSpacing: -1.5 },
  heroCurrency: { fontSize: 24, fontWeight: '700', color: COLORS.textSecondary, marginLeft: 6 },
  heroBatchText: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontWeight: '500' },

  // Modern Cards
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  modernCard: {
    flex: 1, backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modernCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  modernCardTitle: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  modernCardValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  modernCardValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  modernCardCurrency: { fontSize: 14, color: COLORS.textMuted, marginLeft: 4, fontWeight: '600' },
  infoRowBar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(79,70,229,0.1)', paddingVertical: 8, borderRadius: 8,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(79,70,229,0.2)',
  },
  infoRowText: { fontSize: 12, color: COLORS.accentLight, fontWeight: '600' },

  // Catalog save
  catalogSaveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
  },
  catalogSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Confirm Production
  confirmProductionBtn: {
    backgroundColor: 'rgba(72, 199, 142, 0.15)',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1.5, borderColor: 'rgba(72, 199, 142, 0.35)',
  },
  confirmProductionBtnText: { color: COLORS.profitCard, fontSize: 15, fontWeight: '700' },

  // Reset
  resetBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  resetBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },

  // Catalog modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalSheet: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 18 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 6, marginLeft: 4 },
  modalInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    height: 52, paddingHorizontal: 16, fontSize: 17,
    fontWeight: '600', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.accent, marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalCancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  modalSaveBtn: {
    flex: 2, backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

