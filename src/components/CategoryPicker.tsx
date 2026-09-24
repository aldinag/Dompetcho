import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { categoryLabel } from '../constants/categoryLabels';
import { categoryIcon } from '../constants/categoryIcons';
import { spacing } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';
import { Category } from '../types';

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
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
            <Icon name={categoryIcon(category.name)} size={18} color={selected ? theme.primaryText : theme.text} />
            <Text style={[styles.label, { color: selected ? theme.primaryText : theme.text }]}>
              {categoryLabel(category.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.xs,
    minHeight: 44, // touch-target minimum takes precedence over the 40px visual chip height
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
