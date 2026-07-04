import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/theme';
import { FilamentItem } from '../../lib/types';
import { InventoryCard } from './InventoryCard';

interface AccordionViewProps {
  groupedInventory: Record<string, Record<string, FilamentItem[]>>;
  isArchived?: boolean;
  prefixKey?: string; // Used to differentiate active and archived states if needed
  onQuickConsume?: (item: FilamentItem) => void;
  onArchive?: (id: string) => void;
  onRestore?: (item: FilamentItem) => void;
  onEdit?: (item: FilamentItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (item: FilamentItem) => void;
}

export function AccordionView({
  groupedInventory,
  isArchived = false,
  prefixKey = '',
  onQuickConsume,
  onArchive,
  onRestore,
  onEdit,
  onDelete,
  onToggleFavorite,
}: AccordionViewProps) {
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const toggleType = (type: string) => setExpandedTypes((p) => ({ ...p, [type]: !p[type] }));
  const toggleBrand = (key: string) => setExpandedBrands((p) => ({ ...p, [key]: !p[key] }));

  return (
    <>
      {Object.keys(groupedInventory).sort().map((type) => {
        const typeKey = `${prefixKey}${type}`;
        const typeExpanded = expandedTypes[typeKey];
        const brandsForType = groupedInventory[type];
        const brandKeys = Object.keys(brandsForType).sort();
        const totalInType = brandKeys.reduce((acc, bk) => acc + brandsForType[bk].length, 0);

        return (
          <View key={typeKey} style={s.accTypeCard}>
            <TouchableOpacity style={s.accTypeHeader} onPress={() => toggleType(typeKey)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{typeExpanded ? '▼' : '▶'}</Text>
                <Text style={s.accTypeTitle}>{type}</Text>
                <View style={s.accBadge}><Text style={s.accBadgeText}>{totalInType}</Text></View>
              </View>
            </TouchableOpacity>

            {typeExpanded && (
              <View style={s.accTypeContent}>
                {brandKeys.map((brand) => {
                  const brandKey = `${typeKey}_${brand}`;
                  const brandExpanded = expandedBrands[brandKey];
                  const items = brandsForType[brand];

                  return (
                    <View key={brandKey} style={s.accBrandCard}>
                      <TouchableOpacity style={s.accBrandHeader} onPress={() => toggleBrand(brandKey)} activeOpacity={0.7}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>{brandExpanded ? '▼' : '▶'}</Text>
                          <Text style={s.accBrandTitle}>{brand}</Text>
                          <View style={[s.accBadge, { backgroundColor: COLORS.surfaceLight }]}><Text style={s.accBadgeText}>{items.length}</Text></View>
                        </View>
                      </TouchableOpacity>

                      {brandExpanded && (
                        <View style={s.accBrandContent}>
                          {items.map((item) => (
                            <InventoryCard
                              key={item.id}
                              item={item}
                              isArchived={isArchived}
                              onQuickConsume={onQuickConsume}
                              onArchive={onArchive}
                              onRestore={onRestore}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onToggleFavorite={onToggleFavorite}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  accTypeCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accTypeHeader: { padding: 16, backgroundColor: COLORS.surfaceLight },
  accTypeTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  accBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  accBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  accTypeContent: { padding: 12, backgroundColor: COLORS.surface },
  accBrandCard: {
    backgroundColor: COLORS.bg, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  accBrandHeader: { padding: 12, backgroundColor: COLORS.surfaceLight },
  accBrandTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  accBrandContent: { padding: 10 },
});
