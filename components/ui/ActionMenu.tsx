import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/theme';

export function ActionMenu() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const handleNavigate = (route: string) => {
    setVisible(false);
    if (route) {
      setTimeout(() => {
        router.push(route as any);
      }, 150);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerBtn}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="apps" size={22} color={COLORS.text} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Özellikler Menüsü</Text>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('/inventory')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(72, 199, 142, 0.15)' }]}>
                    <Text style={{ fontSize: 20 }}>🧵</Text>
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuTitle}>Filament Yönetimi</Text>
                    <Text style={styles.menuDesc}>Stok takibi, renkler ve kalibrasyon K-değerleri.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('/catalog')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 70, 229, 0.15)' }]}>
                    <Text style={{ fontSize: 20 }}>📋</Text>
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuTitle}>Ürün Kataloğu</Text>
                    <Text style={styles.menuDesc}>Kaydedilen modeller ve hızlı fiyat analizleri.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                <View style={[styles.menuItem, { opacity: 0.6 }]}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 159, 67, 0.15)' }]}>
                    <Text style={{ fontSize: 20 }}>🧊</Text>
                  </View>
                  <View style={styles.menuItemText}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.menuTitle}>3D Model İnceleme</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Yakında</Text>
                      </View>
                    </View>
                    <Text style={styles.menuDesc}>Mobilde STL/3MF modellerini 3 boyutlu görüntüleyin.</Text>
                  </View>
                  <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: 'rgba(255, 159, 67, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.4)',
  },
  badgeText: {
    fontSize: 10,
    color: '#ff9f43',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
