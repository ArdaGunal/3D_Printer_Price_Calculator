import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../lib/theme';
import { STORAGE_KEYS, DEFAULT_HOURLY_COST, DEFAULT_SERVICE_FEE } from '../lib/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Main Screen ─────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [hourlyCost, setHourlyCost] = useState<string>('5');
  const [serviceFee, setServiceFee] = useState<string>('0');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  // Auto-save hourlyCost
  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      const n = parseFloat(hourlyCost) || DEFAULT_HOURLY_COST;
      AsyncStorage.setItem(STORAGE_KEYS.hourlyCost, JSON.stringify(n));
    }, 400);
    return () => clearTimeout(t);
  }, [hourlyCost, isLoaded]);

  // Auto-save serviceFee
  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      const n = parseFloat(serviceFee) || DEFAULT_SERVICE_FEE;
      AsyncStorage.setItem(STORAGE_KEYS.serviceFee, JSON.stringify(n));
    }, 400);
    return () => clearTimeout(t);
  }, [serviceFee, isLoaded]);

  const loadSettings = async () => {
    try {
      const [hourly, fee] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.hourlyCost),
        AsyncStorage.getItem(STORAGE_KEYS.serviceFee),
      ]);
      if (hourly) setHourlyCost(String(JSON.parse(hourly)));
      if (fee) setServiceFee(String(JSON.parse(fee)));
    } catch (e) {
      console.log('Settings load error:', e);
    } finally {
      setIsLoaded(true);
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>⚙️ Ayarlar</Text>
          <Text style={s.headerSubtitle}>Gider & Sistem Yönetimi</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Filament Yönetimi Butonu ─── */}
        <TouchableOpacity
          style={s.navBtn}
          onPress={() => router.push('/inventory')}
          activeOpacity={0.8}
        >
          <View style={s.navBtnInner}>
            <Text style={s.navBtnIcon}>🧵</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.navBtnTitle}>Filament Yönetimi</Text>
              <Text style={s.navBtnHint}>Envanter, stok takibi ve filament ekleme</Text>
            </View>
            <Text style={s.navBtnArrow}>▶</Text>
          </View>
        </TouchableOpacity>

        {/* ─── Hourly Cost ─── */}
        <Text style={s.sectionTitle}>⚡ Saatlik Gider Ayarları</Text>
        <Text style={s.sectionHint}>Elektrik, makine aşınma payı ve sabit hizmet bedeli</Text>

        <View style={s.hourlyCard}>
          <View style={s.hourlyLeft}>
            <Text style={s.hourlyIcon}>⚡</Text>
            <View>
              <Text style={s.hourlyLabel}>Saat Başına Gider</Text>
              <Text style={s.hourlyDesc}>Elektrik + Makine Yıpranma</Text>
            </View>
          </View>
          <View style={s.hourlyInputRow}>
            <TextInput
              style={s.hourlyInput}
              keyboardType="decimal-pad"
              value={hourlyCost}
              onChangeText={(v) => setHourlyCost(v.replace(/[^0-9.]/g, ''))}
              placeholder="5"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={s.hourlyUnit}>₺/sa</Text>
          </View>
        </View>

        <View style={s.hourlyCard}>
          <View style={s.hourlyLeft}>
            <Text style={s.hourlyIcon}>🛠️</Text>
            <View>
              <Text style={s.hourlyLabel}>Başlatma Bedeli</Text>
              <Text style={s.hourlyDesc}>Emek + Hazırlık Süresi</Text>
            </View>
          </View>
          <View style={s.hourlyInputRow}>
            <TextInput
              style={s.hourlyInput}
              keyboardType="decimal-pad"
              value={serviceFee}
              onChangeText={(v) => setServiceFee(v.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={s.hourlyUnit}>₺</Text>
          </View>
        </View>

        {/* Auto-save indicator */}
        <View style={s.autoSaveIndicator}>
          <Text style={s.autoSaveText}>✅ Değişiklikler otomatik kaydedilir</Text>
        </View>

        {/* Info Card */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>ℹ️ Formül Bilgisi</Text>
          <Text style={s.infoText}>
            Filament Maliyeti = Gram × (Fiyat ÷ Gramaj)
          </Text>
          <Text style={[s.infoText, { marginTop: 6 }]}>
            Kârlı Filament = Filament Maliyeti × Kâr Çarpanı
          </Text>
          <Text style={[s.infoText, { marginTop: 6 }]}>
            Satış Fiyatı = Kârlı Filament + (Saat × Saatlik) + Hizmet + Ekstra
          </Text>
          <Text style={[s.infoText, { marginTop: 6 }]}>
            Birim Satış = Satış Fiyatı ÷ Ürün Sayısı
          </Text>
          <Text style={[s.infoText, { marginTop: 10, fontStyle: 'italic', color: '#f39c12' }]}>
            ⚠️ Kâr çarpanı sadece filament maliyetine uygulanır.{'\n'}Sabit giderler (elektrik, hizmet) olduğu gibi eklenir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 40 },

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

  // Nav button to inventory
  navBtn: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginTop: 18, borderWidth: 1, borderColor: COLORS.accent,
    overflow: 'hidden',
  },
  navBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 18,
  },
  navBtnIcon: { fontSize: 28 },
  navBtnTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  navBtnHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  navBtnArrow: { fontSize: 14, color: COLORS.textMuted },

  // Sections
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text,
    marginTop: 28, marginBottom: 4,
  },
  sectionHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },

  // Hourly / Service
  hourlyCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 6,
  },
  hourlyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  hourlyIcon: { fontSize: 24 },
  hourlyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  hourlyDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  hourlyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hourlyInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 12,
    height: 48, width: 84, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: COLORS.accentLight,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  hourlyUnit: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  // Auto save
  autoSaveIndicator: {
    backgroundColor: 'rgba(72,199,142,0.08)', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    marginTop: 16, borderWidth: 1, borderColor: 'rgba(72,199,142,0.2)',
  },
  autoSaveText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },

  // Info
  infoCard: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 14,
    padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  infoText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontWeight: '500' },
});
