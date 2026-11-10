import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { categoryIcon } from '../constants/categoryIcons';
import { categoryLabel } from '../constants/categoryLabels';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { Category } from '../types';

interface CategoryFilterBarProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

// Mirrors AccountPicker's "null = no filter" chip pattern, but for filtering Home's
// transaction list by category rather than tagging a single expense — hidden entirely
// until there's at least one category to filter by.
export function CategoryFilterBar({ categories, selectedId, onSelect }: CategoryFilterBarProps) {
  const theme = useTheme();
  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityLabel="Semua kategori"
        accessibilityState={{ selected: selectedId === null }}
        style={[
          styles.chip,
          {
            backgroundColor: selectedId === null ? theme.primary : theme.surface,
            borderColor: selectedId === null ? theme.primary : theme.border,
          },
        ]}
      >
        <Text style={[styles.label, selectedId === null && styles.labelSelected, { color: selectedId === null ? theme.primaryText : theme.text }]}>
          Semua
        </Text>
      </TouchableOpacity>

      {categories.map(category => {
        const selected = category.id === selectedId;
        return (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelect(category.id)}
            accessibilityRole="button"
            accessibilityLabel={categoryLabel(category.name)}
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <Icon name={categoryIcon(category.name)} size={16} color={selected ? theme.primaryText : theme.text} />
            <Text style={[styles.label, selected && styles.labelSelected, { color: selected ? theme.primaryText : theme.text }]}>
              {categoryLabel(category.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView defaults to flexGrow/flexShrink 1, so beside a flex:1 list (Home's
  // SectionList) the two split the height and the chips got squashed and cut off. Pin it to its
  // content height.
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
  },
  label: {
    ...typography.body,
  },
  labelSelected: {
    fontWeight: '600',
  },
});
