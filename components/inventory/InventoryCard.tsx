import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, TYPE_COLORS } from '../../lib/theme';
import { FilamentItem } from '../../lib/types';

interface InventoryCardProps {
  item: FilamentItem;
  isArchived?: boolean;
  variant?: 'default' | 'compact';
  onQuickConsume?: (item: FilamentItem) => void;
  onArchive?: (id: string) => void;
  onRestore?: (item: FilamentItem) => void;
  onEdit?: (item: FilamentItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (item: FilamentItem) => void;
}

export function InventoryCard({
  item,
  isArchived = false,
  variant = 'default',
  onQuickConsume,
  onArchive,
  onRestore,
  onEdit,
  onDelete,
  onToggleFavorite,
}: InventoryCardProps) {
  const displayName = item.color || item.brand || item.name;
  const dotColor = item.hexColor || TYPE_COLORS[item.type] || COLORS.accent;
  const [expanded, setExpanded] = useState(false);

  if (variant === 'compact') {
    const compactName = `${item.brand || 'Bilinmeyen'} - ${item.color || item.name}`;
    const stockPercent = item.weightGrams > 0 
      ? Math.round(((item.stockGrams ?? item.weightGrams) / item.weightGrams) * 100) 
      : 0;
    
    return (
      <View style={[s.compactCard, isArchived && s.archivedOpacity]}>
        <View style={s.topRightActions}>
          {onToggleFavorite && (
            <TouchableOpacity 
              style={s.topRightBtn} 
              onPress={() => onToggleFavorite(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10 }}
            >
              <Text style={[s.topRightBtnText, item.isFavorite ? { color: '#f39c12', fontSize: 14 } : { color: COLORS.border, fontSize: 14 }]}>
                {item.isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity 
              style={s.topRightBtn} 
              onPress={() => onDelete(item.id)} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Text style={[s.topRightBtnText, { color: COLORS.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Main Row */}
        <View style={s.compactMainRow}>
          <TouchableOpacity 
            style={s.expandBtn} 
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Text style={s.expandBtnText}>{expanded ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          <View style={s.compactContent}>
            <View style={[s.compactDot, { backgroundColor: dotColor }]} />
            <Text style={[s.compactName, isArchived && s.archivedText]} numberOfLines={1}>
              {compactName} <Text style={s.compactMaterial}>[{item.type}]</Text>
            </Text>
            {item.kValue != null && (
              <View style={s.kBadge}>
                <Text style={s.kBadgeText}>K: {item.kValue}</Text>
              </View>
            )}
          </View>
          <View style={s.cardActions}>
            {isArchived ? (
              <>
                {onRestore && (
                  <TouchableOpacity style={s.restoreBtn} onPress={() => onRestore(item)} activeOpacity={0.7}>
                    <Text style={s.restoreBtnText}>🔄</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {onQuickConsume && (
                  <TouchableOpacity style={s.quickConsumeBtn} onPress={() => onQuickConsume(item)} activeOpacity={0.7}>
                    <Text style={s.quickConsumeBtnText}>⚡</Text>
                  </TouchableOpacity>
                )}
                {onEdit && (
                  <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
                    <Text style={s.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Expandable Detail */}
        {expanded && (
          <View style={s.detailSection}>
            <View style={s.detailDivider} />
            <View style={s.detailGrid}>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Stok</Text>
                <Text style={s.detailValue}>{item.stockGrams ?? item.weightGrams} / {item.weightGrams} gr</Text>
                <View style={s.stockBarOuter}>
                  <View style={[s.stockBarInner, { 
                    width: `${Math.min(stockPercent, 100)}%` as any,
                    backgroundColor: stockPercent > 50 ? '#48c78e' : stockPercent > 20 ? '#f39c12' : '#ff4757',
                  }]} />
                </View>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>Fiyat</Text>
                <Text style={s.detailValue}>{item.price} ₺</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>KG Fiyatı</Text>
                <Text style={s.detailValue}>{item.pricePerKg.toFixed(0)} ₺/kg</Text>
              </View>
              {item.kValue != null && (
                <View style={s.detailItem}>
                  <Text style={s.detailLabel}>K-Değeri</Text>
                  <Text style={[s.detailValue, { color: COLORS.accentLight }]}>{item.kValue}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  // Default variant
  return (
    <View style={[s.inventoryCard, isArchived && s.archivedCard]}>
      <View style={s.topRightActions}>
        {onToggleFavorite && (
          <TouchableOpacity 
            style={s.topRightBtn} 
            onPress={() => onToggleFavorite(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10 }}
          >
            <Text style={[s.topRightBtnText, item.isFavorite ? { color: '#f39c12', fontSize: 14 } : { color: COLORS.border, fontSize: 14 }]}>
              {item.isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity 
            style={s.topRightBtn} 
            onPress={() => onDelete(item.id)} 
            activeOpacity={0.7}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={[s.topRightBtnText, { color: COLORS.textMuted }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[s.inventoryAccent, { backgroundColor: isArchived ? COLORS.textMuted : dotColor }]} />
      <View style={s.inventoryInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {item.hexColor && !isArchived ? (
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.hexColor, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
          ) : null}
          <Text style={[s.inventoryName, isArchived && s.archivedText]} numberOfLines={1}>
            {isArchived && item.brand ? `${item.brand} - ` : ''}{displayName}
          </Text>
        </View>
        <View style={s.inventoryMeta}>
          <View style={[s.typeBadge, isArchived && { borderColor: 'transparent' }]}>
            <Text style={[s.typeBadgeText, isArchived && { color: COLORS.textSecondary }]}>{item.type}</Text>
          </View>
          {item.kValue != null && (
            <View style={s.kBadge}>
              <Text style={s.kBadgeText}>K: {item.kValue}</Text>
            </View>
          )}
          <Text style={s.inventoryPriceText}>
            Stok: {item.stockGrams ?? item.weightGrams} / {item.weightGrams} gr
          </Text>
          <Text style={s.inventoryPerKg}>
            {item.price} ₺ ({item.pricePerKg.toFixed(0)} ₺/kg)
          </Text>
        </View>
      </View>
      <View style={s.cardActions}>
        {isArchived ? (
          <>
            {onRestore && (
              <TouchableOpacity style={s.restoreBtn} onPress={() => onRestore(item)} activeOpacity={0.7}>
                <Text style={s.restoreBtnText}>🔄</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {onQuickConsume && (
              <TouchableOpacity style={s.quickConsumeBtn} onPress={() => onQuickConsume(item)} activeOpacity={0.7}>
                <Text style={s.quickConsumeBtnText}>⚡</Text>
              </TouchableOpacity>
            )}
            {onArchive && (
              <TouchableOpacity style={s.archiveBtn} onPress={() => onArchive(item.id)} activeOpacity={0.7}>
                <Text style={s.archiveBtnText}>📦</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)} activeOpacity={0.7}>
                <Text style={s.editBtnText}>✏️</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Default Card
  inventoryCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  archivedCard: { opacity: 0.6, borderColor: 'rgba(255,255,255,0.05)' },
  archivedOpacity: { opacity: 0.6 },
  archivedText: { textDecorationLine: 'line-through', color: COLORS.textMuted },
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
  
  // Compact Card (Search)
  compactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactDot: {
    width: 12, height: 12, borderRadius: 6, marginRight: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  compactName: {
    fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1,
  },
  compactMaterial: {
    color: COLORS.accentLight, fontWeight: '800',
  },

  // Expand Button
  expandBtn: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
  },
  expandBtnText: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: '700',
  },

  // Detail Section (Expandable)
  detailSection: { marginTop: 8 },
  detailDivider: {
    height: 1, backgroundColor: COLORS.border,
    marginBottom: 10, marginHorizontal: 4,
  },
  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4,
  },
  detailItem: {
    backgroundColor: '#1C1C1E', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    minWidth: '30%' as any, flex: 1,
    borderWidth: 1, borderColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 10, color: COLORS.textMuted, fontWeight: '600',
    letterSpacing: 0.3, marginBottom: 3,
  },
  detailValue: {
    fontSize: 13, color: COLORS.text, fontWeight: '700',
  },
  stockBarOuter: {
    height: 3, backgroundColor: COLORS.border,
    borderRadius: 2, marginTop: 5, overflow: 'hidden',
  },
  stockBarInner: {
    height: '100%' as any, borderRadius: 2,
  },

  // K-Value Badge
  kBadge: {
    backgroundColor: 'rgba(108,92,231,0.12)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(108,92,231,0.25)',
    marginLeft: 6,
  },
  kBadgeText: {
    fontSize: 10, fontWeight: '700', color: COLORS.accentLight, letterSpacing: 0.3,
  },

  // Actions
  cardActions: { flexDirection: 'row', gap: 6, paddingRight: 2 },
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
  topRightActions: {
    position: 'absolute', top: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', zIndex: 10, gap: 12,
  },
  topRightBtn: { padding: 4 },
  topRightBtnText: { fontSize: 12, fontWeight: '700' },
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
});
