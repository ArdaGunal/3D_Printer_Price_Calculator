import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Modal, KeyboardAvoidingView,
  Platform, LayoutAnimation, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, TYPE_COLORS } from '../lib/theme';
import {
  FilamentItem, FILAMENT_TYPES, PALETTE_COLORS, STORAGE_KEYS,
  normalizeItem, computePricePerKg, toTitleCase,
} from '../lib/types';
import {
  loadInventory, saveInventory, quickConsumeFilament,
  loadRecentColors, addRecentColor,
} from '../lib/storage';
import { SearchBar } from '../components/inventory/SearchBar';
import { AccordionView } from '../components/inventory/AccordionView';
import { SearchResultsList } from '../components/inventory/SearchResultsList';
import { InventoryCard } from '../components/inventory/InventoryCard';
import { CustomAlert, CustomAlertButton } from '../components/ui/CustomAlert';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── TypeSelector component ───────────────────────────
interface TypeSelectorProps {
  value: string;
  onChange: (t: string) => void;
}
function TypeSelector({ value, onChange }: TypeSelectorProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={s.typeSelector}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <View style={s.typeSelectorInner}>
          <View style={[s.typeDot, { backgroundColor: TYPE_COLORS[value] || COLORS.accent }]} />
          <Text style={s.typeSelectorText}>{value}</Text>
        </View>
        <Text style={s.typeSelectorArrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.typeGrid}>
          {FILAMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[s.typeChip, value === type && s.typeChipActive]}
              onPress={() => { onChange(type); setOpen(false); }}
              activeOpacity={0.7}
            >
              <View style={[s.typeChipDot, { backgroundColor: TYPE_COLORS[type] || COLORS.accent }]} />
              <Text style={[s.typeChipText, value === type && s.typeChipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

// ─── ColorPickerModal Component ───────────────────────
function ColorPickerModal({ visible, onClose, color, onChange, recentColors }: any) {
  const [hexInput, setHexInput] = useState(color || '');

  useEffect(() => {
    if (visible) setHexInput(color || '');
  }, [visible, color]);

  const handleHexChange = (text: string) => {
    const formatted = text.startsWith('#') || text === '' ? text : `#${text}`;
    setHexInput(formatted);
    if (/^#[0-9A-Fa-f]{6}$/.test(formatted) || formatted === '') {
      onChange(formatted);
    }
  };

  const selectColor = (c: string) => {
    setHexInput(c);
    onChange(c);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={cp.overlay}>
          <TouchableOpacity style={cp.overlayTouch} onPress={onClose} activeOpacity={1} />
          <View style={cp.modal}>
            <View style={cp.header}>
              <Text style={cp.headerTitle}>🎨 Renk Seçimi</Text>
              <TouchableOpacity onPress={onClose} style={cp.closeBtn} activeOpacity={0.7}>
                <Text style={cp.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={cp.grid}>
              {PALETTE_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[cp.colorBox, { backgroundColor: c }, color?.toUpperCase() === c && cp.colorBoxActive]}
                  onPress={() => selectColor(c)}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            <View style={cp.hexInputContainer}>
              <Text style={cp.hexLabel}>HEX KODU</Text>
              <View style={cp.hexInputWrapper}>
                <View style={[cp.hexPreview, { backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(hexInput) ? hexInput : 'transparent' }]} />
                <TextInput
                  style={cp.hexInput}
                  value={hexInput}
                  onChangeText={handleHexChange}
                  placeholder="#000000"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>

            {recentColors && recentColors.length > 0 && (
              <View style={cp.recentContainer}>
                <Text style={cp.hexLabel}>SON KULLANILANLAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cp.recentGrid}>
                  {recentColors.map((c: string) => (
                    <TouchableOpacity
                      key={c}
                      style={[cp.recentBox, { backgroundColor: c }]}
                      onPress={() => selectColor(c)}
                      activeOpacity={0.8}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  overlayTouch: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  modal: { width: '90%', backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 },
  colorBox: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  colorBoxActive: { borderWidth: 3, borderColor: COLORS.accent },
  hexInputContainer: { backgroundColor: COLORS.surfaceLight, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  hexLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  hexInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hexPreview: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hexInput: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, padding: 0 },
  recentContainer: { marginTop: 20 },
  recentGrid: { flexDirection: 'row', gap: 10 },
  recentBox: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});

// ─── Edit Modal ───────────────────────────────────────
interface EditModalProps {
  item: FilamentItem | null;
  onClose: () => void;
  onSave: (updated: FilamentItem) => void;
  recentColors: string[];
}
function EditModal({ item, onClose, onSave, recentColors }: EditModalProps) {
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexColor, setHexColor] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [type, setType] = useState('PLA');
  const [price, setPrice] = useState('');
  const [weightGrams, setWeightGrams] = useState('1000');
  const [kValue, setKValue] = useState('');

  useEffect(() => {
    if (item) {
      if (item.brand && item.color) {
        setBrand(item.brand);
        setColor(item.color);
      } else {
        // Fallback for older items that only have 'name'
        setBrand(item.name || '');
        setColor('');
      }
      setHexColor(item.hexColor || '');
      setIsFavorite(item.isFavorite || false);
      setType(item.type);
      setPrice(String(item.price));
      setWeightGrams(String(item.weightGrams));
      setKValue(item.kValue != null ? String(item.kValue) : '');
    }
  }, [item]);

  const handleSave = () => {
    if (!brand.trim()) { Alert.alert('Uyarı', 'Marka adı boş olamaz.'); return; }
    if (!color.trim()) { Alert.alert('Uyarı', 'Renk boş olamaz.'); return; }
    const numPrice = parseFloat(price);
    const numGrams = parseInt(weightGrams);
    if (!numPrice || numPrice <= 0) { Alert.alert('Uyarı', 'Geçerli bir fiyat girin.'); return; }
    if (!numGrams || numGrams <= 0) { Alert.alert('Uyarı', 'Geçerli bir gram değeri girin.'); return; }
    
    const normalizedBrand = toTitleCase(brand.trim());
    const normalizedType = type.toUpperCase();

    const updated: FilamentItem = {
      id: item!.id,
      name: `${normalizedBrand} - ${color.trim()}`,
      brand: normalizedBrand,
      color: color.trim(),
      hexColor: hexColor.trim(),
      isFavorite,
      isActive: item!.isActive !== false,
      type: normalizedType,
      price: numPrice,
      weightGrams: numGrams,
      pricePerKg: computePricePerKg(numPrice, numGrams),
      // If spool weight changed, reset stock to new weight (fresh spool).
      // Otherwise preserve current stock.
      stockGrams: numGrams !== item!.weightGrams
        ? numGrams
        : (item!.stockGrams ?? item!.weightGrams),
      kValue: kValue.trim() ? parseFloat(kValue) || undefined : undefined,
    };
    onSave(updated);
  };

  const perKgPreview = (() => {
    const p = parseFloat(price);
    const g = parseInt(weightGrams);
    if (!p || !g || g <= 0) return null;
    return (p / g * 1000).toFixed(2);
  })();

  if (!item) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={ms.overlay}>
          <View style={ms.sheet}>
            {/* Handle */}
            <View style={ms.handle} />

            {/* Header */}
            <View style={ms.header}>
              <Text style={ms.headerTitle}>✏️ Filament Düzenle</Text>
              <TouchableOpacity onPress={onClose} style={ms.closeBtn} activeOpacity={0.7}>
                <Text style={ms.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, alignSelf: 'flex-start', padding: 6 }}
                onPress={() => setIsFavorite(!isFavorite)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>{isFavorite ? '⭐' : '☆'}</Text>
                <Text style={{ color: isFavorite ? COLORS.warning : COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>
                  {isFavorite ? 'Sık Kullanılanlarda' : 'Sık Kullanılanlara Ekle'}
                </Text>
              </TouchableOpacity>

              {/* Brand & Color */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={ms.label}>MARKA</Text>
                  <TextInput
                    style={ms.input}
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="Örn: eSUN"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ms.label}>RENK ADI</Text>
                  <TextInput
                    style={ms.input}
                    value={color}
                    onChangeText={setColor}
                    placeholder="Örn: Mavi"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={ms.label}>RENK PALETİ (Opsiyonel)</Text>
                <TouchableOpacity 
                  style={[ms.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }]} 
                  onPress={() => setShowColorPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: hexColor || 'transparent', borderWidth: 1, borderColor: COLORS.border }} />
                    <Text style={{ color: hexColor ? COLORS.text : COLORS.textMuted, fontSize: 16, fontWeight: '600' }}>{hexColor || 'Renk Seç'}</Text>
                  </View>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>▼</Text>
                </TouchableOpacity>
              </View>

              <ColorPickerModal
                visible={showColorPicker}
                onClose={() => setShowColorPicker(false)}
                color={hexColor}
                onChange={setHexColor}
                recentColors={recentColors}
              />

              {/* Type */}
              <Text style={[ms.label, { marginTop: 14 }]}>FİLAMENT TÜRÜ</Text>
              <TypeSelector value={type} onChange={setType} />

              {/* Price + Weight */}
              <Text style={[ms.label, { marginTop: 14 }]}>FİYAT BİLGİSİ</Text>
              <View style={ms.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={ms.subLabel}>Fiyat (₺)</Text>
                  <View style={ms.inputRow}>
                    <TextInput
                      style={[ms.input, { flex: 1, marginBottom: 0 }]}
                      value={price}
                      onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="Örn: 700"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <View style={ms.unitBadge}><Text style={ms.unitText}>₺</Text></View>
                  </View>
                </View>
                <View style={ms.priceDivider} />
                <View style={{ flex: 1 }}>
                  <Text style={ms.subLabel}>Makara Gramı</Text>
                  <View style={ms.inputRow}>
                    <TextInput
                      style={[ms.input, { flex: 1, marginBottom: 0 }]}
                      value={weightGrams}
                      onChangeText={(v) => setWeightGrams(v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="1000"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <View style={ms.unitBadge}><Text style={ms.unitText}>gr</Text></View>
                  </View>
                </View>
              </View>

              {/* K-Value (Optional) */}
              <View style={{ marginTop: 14 }}>
                <Text style={ms.label}>K-DEĞERİ (Opsiyonel)</Text>
                <View style={ms.inputRow}>
                  <TextInput
                    style={[ms.input, { flex: 1, marginBottom: 0 }]}
                    value={kValue}
                    onChangeText={(v) => setKValue(v.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="Örn: 0.025"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <View style={[ms.unitBadge, { backgroundColor: 'rgba(108,92,231,0.15)', borderColor: 'rgba(108,92,231,0.3)', borderWidth: 1 }]}>
                    <Text style={[ms.unitText, { color: COLORS.accentLight }]}>K</Text>
                  </View>
                </View>
              </View>

              {/* Per-kg preview */}
              {perKgPreview && (
                <View style={ms.previewBanner}>
                  <Text style={ms.previewText}>
                    📐 Hesaplanan 1 KG Fiyatı: <Text style={ms.previewValue}>{perKgPreview} ₺/kg</Text>
                  </Text>
                </View>
              )}

              {/* Buttons */}
              <View style={ms.btnRow}>
                <TouchableOpacity style={ms.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={ms.cancelBtnText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ms.saveBtn} onPress={handleSave} activeOpacity={0.8}>
                  <Text style={ms.saveBtnText}>💾 Kaydet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  label: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  subLabel: {
    fontSize: 10, fontWeight: '600', color: COLORS.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  input: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    height: 48, paddingHorizontal: 14, fontSize: 15,
    fontWeight: '600', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 0,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitBadge: {
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingHorizontal: 12, height: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  unitText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 0 },
  priceDivider: { width: 12 },
  previewBanner: {
    backgroundColor: 'rgba(108,92,231,0.10)',
    borderRadius: 12, padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
  },
  previewText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  previewValue: { color: COLORS.accentLight, fontWeight: '800' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2, backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ─── Inventory Screen ────────────────────────────────
export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [inventory, setInventory] = useState<FilamentItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; buttons: CustomAlertButton[] }>({
    visible: false, title: '', message: '', buttons: []
  });

  const showAlert = (title: string, message: string, buttons: CustomAlertButton[] = [{ text: 'Tamam', style: 'cancel' }]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  };
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  // Add form state
  const [formBrand, setFormBrand] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formHexColor, setFormHexColor] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [formType, setFormType] = useState('PLA');
  const [formPrice, setFormPrice] = useState('');
  const [formWeight, setFormWeight] = useState('1000');
  const [formKValue, setFormKValue] = useState('');

  // Color picker states
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showFormColorPicker, setShowFormColorPicker] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Main Accordion state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isInvOpen, setIsInvOpen] = useState(true);

  const toggleMainSection = (section: 'add' | 'inv') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'add') setIsAddOpen(!isAddOpen);
    if (section === 'inv') setIsInvOpen(!isInvOpen);
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Edit modal state
  const [editItem, setEditItem] = useState<FilamentItem | null>(null);

  // Quick consume modal state
  const [quickConsumeItem, setQuickConsumeItem] = useState<FilamentItem | null>(null);
  const [quickConsumeGrams, setQuickConsumeGrams] = useState('');

  // Grouping logic
  const activeInventory = inventory.filter((f) => f.isActive !== false);
  const archivedInventory = inventory.filter((f) => f.isActive === false);

  const favorites = activeInventory.filter((f) => f.isFavorite);

  // groupedInventory now includes ALL active items, so favorites remain in their main categories
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

  const groupedArchivedInventory = archivedInventory.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = {};
    const brand = item.brand || 'Diğer';
    if (!acc[item.type][brand]) acc[item.type][brand] = [];
    acc[item.type][brand].push(item);
    return acc;
  }, {} as Record<string, Record<string, FilamentItem[]>>);

  const isSearching = searchQuery.trim().length > 0;
  const queryLower = searchQuery.toLowerCase();
  const currentTabInventory = activeTab === 'active' ? activeInventory : archivedInventory;
  const searchResults = isSearching 
    ? currentTabInventory.filter(item => 
        (item.brand && item.brand.toLowerCase().includes(queryLower)) ||
        (item.color && item.color.toLowerCase().includes(queryLower)) ||
        (item.type && item.type.toLowerCase().includes(queryLower)) ||
        (item.name && item.name.toLowerCase().includes(queryLower))
      )
    : [];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [inv, recent] = await Promise.all([
        loadInventory(),
        loadRecentColors(),
      ]);
      setInventory(inv);
      setRecentColors(recent);
    } catch (e) {
      console.log('Inventory load error:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const persistInventory = async (list: FilamentItem[]) => {
    await saveInventory(list);
  };

  const addToRecentColors = async (hex: string) => {
    const updated = await addRecentColor(hex, recentColors);
    setRecentColors(updated);
  };

  // ─── Add ───────────────────────────────────────────
  const addFilament = () => {
    if (!formBrand.trim()) { showAlert('Uyarı', 'Filament markası boş olamaz.'); return; }
    if (!formColor.trim()) { showAlert('Uyarı', 'Filament rengi boş olamaz.'); return; }
    const numPrice = parseFloat(formPrice);
    const numGrams = parseInt(formWeight) || 1000;
    if (!numPrice || numPrice <= 0) { showAlert('Uyarı', 'Geçerli bir fiyat girin.'); return; }

    const normalizedBrand = toTitleCase(formBrand.trim());
    const normalizedType = formType.toUpperCase();

    const item: FilamentItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: `${normalizedBrand} - ${formColor.trim()}`,
      brand: normalizedBrand,
      color: formColor.trim(),
      hexColor: formHexColor.trim(),
      isFavorite: formIsFavorite,
      isActive: true,
      type: normalizedType,
      price: numPrice,
      weightGrams: numGrams,
      pricePerKg: computePricePerKg(numPrice, numGrams),
      stockGrams: numGrams,
      kValue: formKValue.trim() ? parseFloat(formKValue) || undefined : undefined,
    };
    const updated = [...inventory, item];
    setInventory(updated);
    persistInventory(updated);
    
    if (formHexColor.trim()) {
      addToRecentColors(formHexColor.trim());
    }

    // Reset fields except type
    setFormBrand('');
    setFormColor('');
    setFormHexColor('');
    setFormIsFavorite(false);
    setFormPrice('');
    setFormWeight('1000');
    setFormKValue('');
  };

  // ─── Edit Save ─────────────────────────────────────
  const handleEditSave = (updated: FilamentItem) => {
    const list = inventory.map((f) => (f.id === updated.id ? updated : f));
    setInventory(list);
    persistInventory(list);
    
    if (updated.hexColor) {
      addToRecentColors(updated.hexColor);
    }

    setEditItem(null);
  };

  // ─── Delete ────────────────────────────────────────
  const deleteFilament = (id: string) => {
    showAlert('Filamenti Sil', 'Bu filamenti silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: () => {
          const updated = inventory.filter((f) => f.id !== id);
          setInventory(updated);
          persistInventory(updated);
        },
      },
    ]);
  };

  const toggleFavorite = (item: FilamentItem) => {
    const list = inventory.map(f => f.id === item.id ? { ...f, isFavorite: !f.isFavorite } : f);
    setInventory(list);
    persistInventory(list);
  };

  const archiveFilament = (id: string) => {
    showAlert('Filamenti Arşivle', 'Bu filament bitenler listesine taşınacak. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Arşivle',
        onPress: () => {
          const list = inventory.map(f => f.id === id ? { ...f, isActive: false } : f);
          setInventory(list);
          persistInventory(list);
        },
      },
    ]);
  };

  const restoreFilament = (item: FilamentItem) => {
    showAlert('Stoğa Ekle', 'Filament tekrar stoklara eklendi. Fiyatı güncellemek ister misiniz?', [
      {
        text: 'Hayır', style: 'cancel',
        onPress: () => {
          const list = inventory.map(f => f.id === item.id ? { ...f, isActive: true, stockGrams: f.weightGrams } : f);
          setInventory(list);
          persistInventory(list);
        }
      },
      {
        text: 'Evet, Düzenle',
        onPress: () => {
          // Both set active and open edit modal
          const list = inventory.map(f => f.id === item.id ? { ...f, isActive: true, stockGrams: f.weightGrams } : f);
          setInventory(list);
          persistInventory(list);
          setEditItem({ ...item, isActive: true, stockGrams: item.weightGrams });
        },
      },
    ]);
  };

  // Add‑form per-kg preview
  const addPreviewPerKg = (() => {
    const p = parseFloat(formPrice);
    const g = parseInt(formWeight) || 1000;
    if (!p || !g || g <= 0) return null;
    return (p / g * 1000).toFixed(2);
  })();

  // ─── Quick Consume Handler ─────────────────────────
  const handleQuickConsume = async () => {
    if (!quickConsumeItem) return;
    const grams = parseFloat(quickConsumeGrams);
    if (!grams || grams <= 0) {
      showAlert('Uyarı', 'Geçerli bir gram miktarı girin.');
      return;
    }
    const currentStock = quickConsumeItem.stockGrams ?? quickConsumeItem.weightGrams ?? 1000;

    const proceedWithConsume = async (shouldArchive: boolean) => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.inventory);
        if (!raw) return;
        const storedList: any[] = JSON.parse(raw);
        const idx = storedList.findIndex((f) => f.id === quickConsumeItem.id);
        if (idx >= 0) {
          storedList[idx].stockGrams = Math.max(0, currentStock - grams);
          if (shouldArchive) {
            storedList[idx].isActive = false;
          }
          await AsyncStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(storedList));
          
          setInventory(storedList.map(normalizeItem));
          setQuickConsumeItem(null);
          setQuickConsumeGrams('');
          
          const displayName = quickConsumeItem.brand && quickConsumeItem.color
            ? `${quickConsumeItem.brand} - ${quickConsumeItem.color}`
            : (quickConsumeItem.name || 'Filament');
            
          if (shouldArchive) {
             showAlert('✅ Arşive Alındı', `${displayName} bitenler listesine taşındı.`);
          } else {
             showAlert('✅ Stok Güncellendi', `${displayName} stoktan düşüldü.`);
          }
        }
      } catch (e) {
        showAlert('Hata', 'İşlem başarısız oldu.');
      }
    };

    if (grams > currentStock) {
      showAlert(
        'Yeterli filament yok',
        `Stokta sadece ${currentStock}g mevcut, ancak ${grams}g düşmek istediniz.\n\nNe yapılmasını istersiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Stoktan Düş', onPress: () => proceedWithConsume(false) },
          { text: 'Arşive Al', onPress: () => proceedWithConsume(true) }
        ]
      );
      return;
    }

    // Yeterli stok varsa, stok 0 oluyorsa otomatik arşive al
    proceedWithConsume(currentStock - grams <= 0);
  };



  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {!isLoaded && (
        <View style={s.loadingOverlay}>
          <Text style={s.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      {/* ─── Add Form Color Picker Modal ─── */}
      <ColorPickerModal
        visible={showFormColorPicker}
        onClose={() => setShowFormColorPicker(false)}
        color={formHexColor}
        onChange={setFormHexColor}
        recentColors={recentColors}
      />

      {/* ─── Edit Modal ─── */}
      <EditModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleEditSave}
        recentColors={recentColors}
      />

      {/* ─── Custom Alert Modal ─── */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onRequestClose={closeAlert}
      />

      {/* ─── Quick Consume Modal ─── */}
      <Modal
        visible={!!quickConsumeItem}
        transparent
        animationType="fade"
        onRequestClose={() => { setQuickConsumeItem(null); setQuickConsumeGrams(''); }}
      >
        <View style={qc.overlay}>
          <View style={qc.sheet}>
            <Text style={qc.title}>⚡ Hızlı Tüketim</Text>
            <Text style={qc.subtitle}>
              {quickConsumeItem
                ? (quickConsumeItem.brand && quickConsumeItem.color
                  ? `${quickConsumeItem.brand} - ${quickConsumeItem.color}`
                  : (quickConsumeItem.name || 'Filament'))
                : ''}
            </Text>
            {quickConsumeItem && (
              <View style={qc.stockInfo}>
                <Text style={qc.stockLabel}>Mevcut Stok</Text>
                <Text style={qc.stockValue}>{quickConsumeItem.stockGrams ?? quickConsumeItem.weightGrams ?? 1000} gram</Text>
              </View>
            )}
            <Text style={qc.inputLabel}>Kaç gram harcandı?</Text>
            <TextInput
              style={qc.input}
              placeholder="Örn: 150"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={quickConsumeGrams}
              onChangeText={(v) => setQuickConsumeGrams(v.replace(/[^0-9.]/g, ''))}
              autoFocus
            />
            <View style={qc.btnRow}>
              <TouchableOpacity style={qc.cancelBtn} onPress={() => { setQuickConsumeItem(null); setQuickConsumeGrams(''); }} activeOpacity={0.7}>
                <Text style={qc.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={qc.confirmBtn} onPress={handleQuickConsume} activeOpacity={0.8}>
                <Text style={qc.confirmText}>⚡ Düş</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>🧵 Filament Yönetimi</Text>
          <Text style={s.headerSubtitle}>Envanter & Stok Takibi</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Add Form ─── */}
        {/* ─── Add Form ─── */}
        <TouchableOpacity style={s.mainAccHeader} onPress={() => toggleMainSection('add')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={s.mainAccTitle}>➕ Yeni Filament Ekle</Text>
            <Text style={s.mainAccHint}>Kendi filament markanızı ve fiyatınızı ekleyerek envanter oluşturun</Text>
          </View>
          <View style={s.mainAccIconBg}>
            <Text style={s.mainAccIcon}>{isAddOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isAddOpen && (
          <View style={[s.formCard, { marginTop: -10, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 }]}>
          {/* Brand & Color */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Marka</Text>
              <TextInput
                style={s.formInput}
                placeholder="Örn: eSUN"
                placeholderTextColor={COLORS.textMuted}
                value={formBrand}
                onChangeText={setFormBrand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Renk Adı</Text>
              <TextInput
                style={s.formInput}
                placeholder="Örn: Mavi"
                placeholderTextColor={COLORS.textMuted}
                value={formColor}
                onChangeText={setFormColor}
              />
            </View>
          </View>

          {/* Hex & Favorite */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Renk Paleti</Text>
              <TouchableOpacity 
                style={[s.formInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }]} 
                onPress={() => setShowFormColorPicker(true)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: formHexColor || 'transparent', borderWidth: 1, borderColor: COLORS.border }} />
                  <Text style={{ color: formHexColor ? COLORS.text : COLORS.textMuted, fontSize: 16, fontWeight: '600' }}>{formHexColor || 'Renk Seç'}</Text>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>▼</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{ flex: 1, height: 48, backgroundColor: formIsFavorite ? 'rgba(212,163,115,0.15)' : COLORS.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: formIsFavorite ? COLORS.warning : COLORS.border, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
              onPress={() => setFormIsFavorite(!formIsFavorite)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>{formIsFavorite ? '⭐' : '☆'}</Text>
              <Text style={{ color: formIsFavorite ? COLORS.warning : COLORS.textMuted, fontWeight: '600', fontSize: 13 }}>Sık Kullanılan</Text>
            </TouchableOpacity>
          </View>

          {/* Type */}
          <Text style={[s.formLabel, { marginTop: 14 }]}>Filament Türü</Text>
          <TypeSelector value={formType} onChange={setFormType} />

          {/* Price + Weight */}
          <Text style={[s.formLabel, { marginTop: 14 }]}>Fiyat Bilgisi</Text>
          <View style={s.priceWeightRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>Fiyat (₺)</Text>
              <View style={s.priceInputRow}>
                <TextInput
                  style={[s.formInput, { flex: 1 }]}
                  placeholder="700"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={formPrice}
                  onChangeText={(v) => setFormPrice(v.replace(/[^0-9.]/g, ''))}
                />
                <View style={s.priceUnitBadge}>
                  <Text style={s.priceUnitText}>₺</Text>
                </View>
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>Gram</Text>
              <View style={s.priceInputRow}>
                <TextInput
                  style={[s.formInput, { flex: 1 }]}
                  placeholder="1000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={formWeight}
                  onChangeText={(v) => setFormWeight(v.replace(/[^0-9]/g, ''))}
                />
                <View style={s.priceUnitBadge}>
                  <Text style={s.priceUnitText}>gr</Text>
                </View>
              </View>
            </View>
          </View>

          {/* K-Value (Optional) */}
          <View style={{ marginTop: 14 }}>
            <Text style={s.formLabel}>K-Değeri (Opsiyonel)</Text>
            <View style={s.priceInputRow}>
              <TextInput
                style={[s.formInput, { flex: 1 }]}
                placeholder="Örn: 0.025"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="decimal-pad"
                value={formKValue}
                onChangeText={(v) => setFormKValue(v.replace(/[^0-9.]/g, ''))}
              />
              <View style={[s.priceUnitBadge, { backgroundColor: 'rgba(108,92,231,0.15)', borderColor: 'rgba(108,92,231,0.3)' }]}>
                <Text style={[s.priceUnitText, { color: COLORS.accentLight }]}>K</Text>
              </View>
            </View>
          </View>

          {/* Per-kg preview */}
          {addPreviewPerKg && (
            <View style={s.previewBanner}>
              <Text style={s.previewText}>
                📐 1 KG Fiyatı: <Text style={s.previewValue}>{addPreviewPerKg} ₺/kg</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity style={s.addBtn} onPress={addFilament} activeOpacity={0.8}>
            <Text style={s.addBtnText}>➕ Envantere Ekle</Text>
          </TouchableOpacity>
        </View>
        )}

        {/* ─── Inventory List ─── */}
        <TouchableOpacity style={s.mainAccHeader} onPress={() => toggleMainSection('inv')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={s.mainAccTitle}>🧵 Filament Envanteri ({inventory.length})</Text>
            <Text style={s.mainAccHint}>Filamentlerinizi yönetin ve bitenleri arşivleyin</Text>
          </View>
          <View style={s.mainAccIconBg}>
            <Text style={s.mainAccIcon}>{isInvOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>

        {isInvOpen && (
        <View style={s.mainAccContent}>

        {/* Tabs */}
        <View style={s.tabContainer}>
          <TouchableOpacity
            style={[s.tabButton, activeTab === 'active' && s.tabButtonActive]}
            onPress={() => setActiveTab('active')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === 'active' && s.tabTextActive]}>Stoktakiler ({activeInventory.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabButton, activeTab === 'archived' && s.tabButtonActive]}
            onPress={() => setActiveTab('archived')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === 'archived' && s.tabTextActive]}>Bitenler ({archivedInventory.length})</Text>
          </TouchableOpacity>
        </View>

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {activeTab === 'active' ? (
          <>
            {activeInventory.length === 0 && !isSearching && (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📦</Text>
                <Text style={s.emptyTitle}>Aktif Envanter Boş</Text>
                <Text style={s.emptyDesc}>Stokta olan filamentiniz bulunmuyor.</Text>
              </View>
            )}

            {/* ⭐ Sık Kullanılanlar */}
            {favorites.length > 0 && !isSearching && (
              <View style={{ marginBottom: 24 }}>
                <Text style={[s.sectionTitle, { color: COLORS.warning, fontSize: 16, marginBottom: 12 }]}>
                  ⭐ Sık Kullanılanlar
                </Text>
                <AccordionView
                  groupedInventory={groupedFavorites}
                  isArchived={false}
                  prefixKey="fav_"
                  onQuickConsume={(item) => { setQuickConsumeItem(item); setQuickConsumeGrams(''); }}
                  onArchive={archiveFilament}
                  onEdit={setEditItem}
                  onDelete={deleteFilament}
                  onToggleFavorite={toggleFavorite}
                />
              </View>
            )}

            {/* ─── Dinamik Görünüm ─── */}
            {isSearching ? (
              <SearchResultsList
                items={searchResults}
                isArchived={false}
                onQuickConsume={(item) => { setQuickConsumeItem(item); setQuickConsumeGrams(''); }}
                onArchive={archiveFilament}
                onEdit={setEditItem}
                onDelete={deleteFilament}
                onToggleFavorite={toggleFavorite}
              />
            ) : (
              <AccordionView
                groupedInventory={groupedInventory}
                isArchived={false}
                onQuickConsume={(item) => { setQuickConsumeItem(item); setQuickConsumeGrams(''); }}
                onArchive={archiveFilament}
                onEdit={setEditItem}
                onDelete={deleteFilament}
                onToggleFavorite={toggleFavorite}
              />
            )}
          </>
        ) : (
          <View style={{ marginTop: 10 }}>
            {archivedInventory.length === 0 && !isSearching ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📦</Text>
                <Text style={s.emptyTitle}>Arşiv Boş</Text>
                <Text style={s.emptyDesc}>Biten ve arşivlenen filamentler burada listelenir.</Text>
              </View>
            ) : (
              <>
                {isSearching ? (
                  <SearchResultsList
                    items={searchResults}
                    isArchived={true}
                    onRestore={restoreFilament}
                    onDelete={deleteFilament}
                onToggleFavorite={toggleFavorite}
                  />
                ) : (
                  <AccordionView
                    groupedInventory={groupedArchivedInventory}
                    isArchived={true}
                    prefixKey="arc_"
                    onRestore={restoreFilament}
                    onDelete={deleteFilament}
                onToggleFavorite={toggleFavorite}
                  />
                )}
              </>
            )}
          </View>
        )}
        </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bg, justifyContent: 'center',
    alignItems: 'center', zIndex: 10,
  },
  loadingText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '500' },

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

  // Sections
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: 20, marginBottom: 4,
  },
  sectionHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },

  // Main Accordions
  mainAccHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 18,
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

  // Form card
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  formLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 10, fontWeight: '600', color: COLORS.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  formInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 14,
    height: 52, paddingHorizontal: 16, fontSize: 16,
    fontWeight: '600', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  priceWeightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceUnitBadge: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingHorizontal: 14, height: 52,
    justifyContent: 'center', alignItems: 'center',
  },
  priceUnitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  previewBanner: {
    backgroundColor: 'rgba(108,92,231,0.08)', borderRadius: 12,
    padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.2)',
  },
  previewText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  previewValue: { color: COLORS.accentLight, fontWeight: '800' },
  addBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 18,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Type selector (shared)
  typeSelector: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 14,
    height: 52, paddingHorizontal: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeDot: { width: 12, height: 12, borderRadius: 6 },
  typeSelectorText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  typeSelectorArrow: { fontSize: 10, color: COLORS.textMuted },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceLight, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeChipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(108,92,231,0.12)' },
  typeChipDot: { width: 8, height: 8, borderRadius: 4 },
  typeChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.accentLight },

  // Empty
  emptyState: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 30, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  // Accordion
  accTypeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accTypeHeader: {
    padding: 16,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  accTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  accTypeContent: {
    padding: 12,
    backgroundColor: COLORS.bg,
  },
  accBrandCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accBrandHeader: {
    padding: 12,
    backgroundColor: COLORS.surface,
  },
  accBrandTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  accBrandContent: {
    padding: 8,
    backgroundColor: COLORS.surfaceLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  accBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  accBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Inventory card
  inventoryCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  inventoryAccent: { width: 4, alignSelf: 'stretch' },
  inventoryInfo: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  inventoryName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  inventoryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeBadge: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.accentLight, textTransform: 'uppercase' },
  inventoryPriceText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  inventoryPerKg: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 6, paddingRight: 12 },
  quickConsumeBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(72, 199, 142, 0.12)',
    borderWidth: 1, borderColor: 'rgba(72, 199, 142, 0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  quickConsumeBtnText: { fontSize: 16 },
  editBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(108,92,231,0.12)',
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  editBtnText: { fontSize: 16 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,71,87,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtnText: { fontSize: 16 },
  archiveBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(243,156,18,0.1)',
    borderWidth: 1, borderColor: 'rgba(243,156,18,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  archiveBtnText: { fontSize: 16 },
  restoreBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(46,204,113,0.1)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  restoreBtnText: { fontSize: 16 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
  },
});

// ─── Quick Consume Modal Styles ──────────────────────
const qc = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  sheet: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '600', color: COLORS.accentLight, marginBottom: 16 },
  stockInfo: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    padding: 12, marginBottom: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  stockLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  stockValue: { fontSize: 15, fontWeight: '800', color: COLORS.success },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 14,
    height: 52, paddingHorizontal: 16, fontSize: 18,
    fontWeight: '600', color: COLORS.text,
    borderWidth: 1.5, borderColor: COLORS.accent, marginBottom: 20,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 2, backgroundColor: COLORS.success, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});



