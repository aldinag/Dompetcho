import React, { useEffect, useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { categoryLabel } from '../constants/categoryLabels';
import { categoryColor, categoryTint } from '../constants/categoryColors';
import { categoryIcon } from '../constants/categoryIcons';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { useExpenseStore } from '../store/useExpenseStore';
import { Expense } from '../types';
import { formatRupiah } from '../utils/format';
import { localMonthKey } from '../utils/timestamp';

interface CategoryRow {
  categoryId: string;
  categoryName?: string;
  amount: number;
}

interface MonthSection {
  key: string;
  title: string;
  total: number;
  data: CategoryRow[];
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function groupByMonth(expenses: Expense[]): MonthSection[] {
  const sections: MonthSection[] = [];
  const indexByMonth = new Map<string, number>();
  const categoryMaps = new Map<string, Map<string, CategoryRow>>();

  for (const e of expenses) {
    // "Total Pengeluaran" is expense-only — income doesn't belong in a spend breakdown.
    if (e.type !== 'expense') continue;
    const monthKey = localMonthKey(e.date);
    let index = indexByMonth.get(monthKey);
    if (index === undefined) {
      index = sections.length;
      indexByMonth.set(monthKey, index);
      sections.push({ key: monthKey, title: monthLabel(monthKey), total: 0, data: [] });
      categoryMaps.set(monthKey, new Map());
    }
    const amount = Number(e.amount);
    sections[index].total += amount;

    const catMap = categoryMaps.get(monthKey)!;
    const catKey = e.category?.id ?? 'uncategorized';
    const existing = catMap.get(catKey);
    if (existing) {
      existing.amount += amount;
    } else {
      catMap.set(catKey, { categoryId: catKey, categoryName: e.category?.name, amount });
    }
  }

  for (const section of sections) {
    section.data = Array.from(categoryMaps.get(section.key)!.values()).sort((a, b) => b.amount - a.amount);
  }

  return sections;
}

export function SummaryScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const expenses = useExpenseStore(state => state.expenses);
  const refreshing = useExpenseStore(state => state.refreshing);
  const loadInitial = useExpenseStore(state => state.loadInitial);
  const refresh = useExpenseStore(state => state.refresh);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const sections = useMemo(() => groupByMonth(expenses), [expenses]);
  const overallTotal = useMemo(() => sections.reduce((sum, s) => sum + s.total, 0), [sections]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Text style={[styles.heading, { color: theme.text }]}>Ringkasan</Text>

      <View style={[styles.totalCard, cardShadow, { backgroundColor: theme.surface }]}>
        <Text style={[styles.total, tabularNums, { color: theme.text }]}>{formatRupiah(overallTotal)}</Text>
        <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Total pengeluaran</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.categoryId}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              <View style={[styles.iconBadge, { backgroundColor: categoryTint(item.categoryName) }]}>
                <Icon name={categoryIcon(item.categoryName)} size={18} color={categoryColor(item.categoryName)} />
              </View>
              <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>
                {categoryLabel(item.categoryName)}
              </Text>
            </View>
            <Text style={[styles.listAmount, tabularNums, { color: theme.textMuted }]}>
              {formatRupiah(item.amount)}
            </Text>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            <Text style={[styles.sectionTotal, tabularNums, { color: theme.danger }]}>
              {formatRupiah(section.total)}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>Belum ada pengeluaran.</Text>
        }
        contentContainerStyle={[styles.listContent, sections.length === 0 && styles.emptyContent]}
        stickySectionHeadersEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { ...typography.h1, marginTop: spacing.xs, marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  totalCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  total: { ...typography.display },
  totalLabel: { ...typography.caption, marginTop: spacing['2xs'] },
  listContent: { paddingBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  listLabel: { ...typography.h2, flexShrink: 1 },
  listAmount: { ...typography.h2, fontWeight: '400' },
  emptyContent: { flexGrow: 1 },
  empty: { ...typography.body, marginTop: spacing['4xl'], textAlign: 'center' },
});
