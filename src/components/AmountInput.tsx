import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

function formatThousands(digits: string): string {
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

interface AmountInputProps {
  /** Amount in whole Rupiah, or null when empty. */
  value: number | null;
  onChangeValue: (value: number | null) => void;
  autoFocus?: boolean;
}

export function AmountInput({ value, onChangeValue, autoFocus }: AmountInputProps) {
  const theme = useTheme();
  const digits = value === null ? '' : String(value);

  function handleChangeText(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    if (cleaned.length === 0) {
      onChangeValue(null);
      return;
    }
    // Guard against runaway input — no real Rupiah expense needs 12 digits.
    onChangeValue(Number(cleaned.slice(0, 12)));
  }

  return (
    <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Jumlah</Text>
        {value !== null && (
          <TouchableOpacity onPress={() => onChangeValue(null)} accessibilityRole="button" accessibilityLabel="Hapus nominal">
            <Text style={[styles.clear, { color: theme.primary }]}>Hapus</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.row}>
        <Text style={[styles.prefix, tabularNums, { color: theme.textMuted }]}>Rp</Text>
        <TextInput
          style={[styles.input, tabularNums, { color: theme.text }]}
          value={formatThousands(digits)}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.textMuted}
          autoFocus={autoFocus}
          accessibilityLabel="Nominal dalam Rupiah"
          maxLength={15}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing['2xs'],
  },
  clear: {
    ...typography.caption,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  prefix: {
    ...typography.h1,
    marginRight: spacing['2xs'],
    marginBottom: 4,
  },
  input: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    minWidth: 80,
    padding: 0,
  },
});
