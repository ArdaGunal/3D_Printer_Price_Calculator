import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/theme';
import { FilamentItem } from '../../lib/types';
import { InventoryCard } from './InventoryCard';

interface SearchResultsListProps {
  items: FilamentItem[];
  isArchived?: boolean;
  onQuickConsume?: (item: FilamentItem) => void;
  onArchive?: (id: string) => void;
  onRestore?: (item: FilamentItem) => void;
  onEdit?: (item: FilamentItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (item: FilamentItem) => void;
}

export function SearchResultsList({
  items,
  isArchived = false,
  onQuickConsume,
  onArchive,
  onRestore,
  onEdit,
  onDelete,
  onToggleFavorite,
}: SearchResultsListProps) {
  if (items.length === 0) {
    return (
      <View style={s.emptyState}>
        <Text style={s.emptyIcon}>🔍</Text>
        <Text style={s.emptyTitle}>Sonuç Bulunamadı</Text>
        <Text style={s.emptyDesc}>Aradığınız kriterlere uygun filament yok.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {items.map((item) => (
        <InventoryCard
          key={item.id}
          item={item}
          isArchived={isArchived}
          variant="compact"
          onQuickConsume={onQuickConsume}
          onArchive={onArchive}
          onRestore={onRestore}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
