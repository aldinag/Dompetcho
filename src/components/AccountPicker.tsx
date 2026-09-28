import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { spacing } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';
import { Account } from '../types';

interface AccountPickerProps {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

// No accounts yet — the picker would be just a bare "Kelola Akun" chip, not worth showing
// (it's already reachable from Profil). Tagging an account is entirely optional (see
// ground rules: defaults to unset), so there's nothing lost by hiding it until the user has
// created their first account.
export function AccountPicker({ accounts, selectedId, onSelect, onManage }: AccountPickerProps) {
  const theme = useTheme();
  if (accounts.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => onSelect(null)}
        accessibilityRole="button"
        accessibilityLabel="Tanpa akun"
        accessibilityState={{ selected: selectedId === null }}
        style={[
          styles.chip,
          {
            backgroundColor: selectedId === null ? theme.primary : theme.surface,
            borderColor: selectedId === null ? theme.primary : theme.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: selectedId === null ? theme.primaryText : theme.text }]}>
          Tanpa akun
        </Text>
      </TouchableOpacity>

      {accounts.map(account => {
        const selected = account.id === selectedId;
        return (
          <TouchableOpacity
            key={account.id}
            onPress={() => onSelect(account.id)}
            accessibilityRole="button"
            accessibilityLabel={account.name}
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}
          >
            <Text style={[styles.label, { color: selected ? theme.primaryText : theme.text }]}>{account.name}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={onManage}
        accessibilityRole="button"
        accessibilityLabel="Kelola akun"
        style={[styles.chip, styles.manageChip, { borderColor: theme.border }]}
      >
        <Text style={[styles.label, { color: theme.primary }]}>Kelola</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
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
  manageChip: {
    borderStyle: 'dashed',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
