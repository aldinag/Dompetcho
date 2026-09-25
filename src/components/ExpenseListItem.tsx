import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from './Icon';
import { categoryLabel } from '../constants/categoryLabels';
import { categoryColor, categoryTint } from '../constants/categoryColors';
import { categoryIcon } from '../constants/categoryIcons';
import { spacing } from '../constants/spacing';
import { typography, tabularNums } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import { Expense } from '../types';
import { formatRupiah } from '../utils/format';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExpenseListItem({ expense }: { expense: Expense }) {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const isReceipt = expense.source === 'receipt_ocr';
  const isIncome = expense.type === 'income';
  const categoryName = expense.category?.name;
  const amountColor = isIncome ? theme.success : theme.danger;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.border }]}
      onPress={() => navigation.navigate('ExpenseForm', { expenseId: expense.id })}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${categoryLabel(categoryName)}, ${formatRupiah(expense.amount)}`}
    >
      <View style={[styles.iconBadge, { backgroundColor: categoryTint(categoryName) }]}>
        <Icon name={categoryIcon(categoryName)} size={20} color={categoryColor(categoryName)} />
      </View>
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {categoryLabel(categoryName)}
        </Text>
        {!!expense.note && (
          <Text style={[styles.note, { color: theme.textMuted }]} numberOfLines={1}>
            {expense.note}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, tabularNums, { color: amountColor }]}>
          {isIncome ? '+' : '-'} {formatRupiah(expense.amount)}
        </Text>
        <View style={[styles.badge, { backgroundColor: theme.background }]}>
          <Icon name={isReceipt ? 'camera' : 'pencil'} size={12} color={theme.textMuted} strokeWidth={2.2} />
          <Text style={[styles.badgeText, { color: theme.textMuted }]}>{isReceipt ? 'Struk' : 'Manual'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  middle: {
    flex: 1,
  },
  title: {
    ...typography.h2,
  },
  note: {
    ...typography.caption,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    ...typography.h2,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
