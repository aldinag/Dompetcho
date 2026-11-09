import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryDonutChart } from '../components/CategoryDonutChart';
import { Icon, IconName } from '../components/Icon';
import { accountColor } from '../constants/accountColors';
import { categoryLabel } from '../constants/categoryLabels';
import { categoryColor } from '../constants/categoryColors';
import { categoryIcon } from '../constants/categoryIcons';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { listExpenses } from '../services/expenseService';
import { Expense } from '../types';
import { formatRupiah } from '../utils/format';
import { localMonthKey } from '../utils/timestamp';

type BreakdownMode = 'category' | 'account';

interface BreakdownRow {
  id: string;
  label: string;
  color: string;
  icon?: IconName;
  amount: number;
}

interface MonthSection {
  key: string;
  title: string;
  total: number;
  data: BreakdownRow[];
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Classifies a single expense into the row it contributes to under the chosen breakdown
// mode — a category (falling back to "Lainnya"/uncategorized) or a source account
// (falling back to "Tanpa Akun" for untagged expenses, see ROADMAP's account-tag item).
function rowFor(e: Expense, mode: BreakdownMode): Omit<BreakdownRow, 'amount'> {
  if (mode === 'category') {
    const name = e.category?.name;
    return { id: e.category?.id ?? 'uncategorized', label: categoryLabel(name), color: categoryColor(name), icon: categoryIcon(name) };
  }
  return { id: e.account_id ?? 'untagged', label: e.account?.name ?? 'Tanpa Akun', color: accountColor(e.account_id) };
}

function groupByMonth(expenses: Expense[], mode: BreakdownMode): MonthSection[] {
  const sections: MonthSection[] = [];
  const indexByMonth = new Map<string, number>();
  const rowMaps = new Map<string, Map<string, BreakdownRow>>();

  for (const e of expenses) {
    // "Total Pengeluaran" is expense-only — income doesn't belong in a spend breakdown.
    if (e.type !== 'expense') continue;
    const monthKey = localMonthKey(e.date);
    let index = indexByMonth.get(monthKey);
    if (index === undefined) {
      index = sections.length;
      indexByMonth.set(monthKey, index);
      sections.push({ key: monthKey, title: monthLabel(monthKey), total: 0, data: [] });
      rowMaps.set(monthKey, new Map());
    }
    const amount = Number(e.amount);
    sections[index].total += amount;

    const row = rowFor(e, mode);
    const rowMap = rowMaps.get(monthKey)!;
    const existing = rowMap.get(row.id);
    if (existing) {
      existing.amount += amount;
    } else {
      rowMap.set(row.id, { ...row, amount });
    }
  }

  for (const section of sections) {
    section.data = Array.from(rowMaps.get(section.key)!.values()).sort((a, b) => b.amount - a.amount);
  }

  return sections;
}

export function SummaryScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  // Unlike Home's "Transaksi Terakhir" (now paginated — see ROADMAP's "Add pagination to
  // listExpenses"), the month/category breakdown below needs every expense ever recorded, so
  // it keeps its own unpaginated fetch here rather than sharing Home's bounded store state.
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<BreakdownMode>('category');

  useEffect(() => {
    listExpenses().then(setExpenses).catch((error: any) => {
      Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    listExpenses()
      .then(setExpenses)
      .catch((error: any) => {
        Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
      })
      .finally(() => setRefreshing(false));
  }, []);

  const sections = useMemo(() => groupByMonth(expenses, mode), [expenses, mode]);
  const overallTotal = useMemo(() => sections.reduce((sum, s) => sum + s.total, 0), [sections]);

  // Index into `sections`, which `groupByMonth` keeps in the newest-first order
  // `listExpenses` already sorts by — so 0 is the latest month and it's the default.
  const [chartMonthIndex, setChartMonthIndex] = useState(0);
  const lastMonthIndex = Math.max(sections.length - 1, 0);
  const selectedMonthIndex = Math.min(chartMonthIndex, lastMonthIndex);
  const chartSection = sections[selectedMonthIndex];
  const hasOlderMonth = selectedMonthIndex < lastMonthIndex;
  const hasNewerMonth = selectedMonthIndex > 0;

  const handleOlderMonth = useCallback(() => {
    setChartMonthIndex(i => Math.min(i + 1, lastMonthIndex));
  }, [lastMonthIndex]);

  const handleNewerMonth = useCallback(() => {
    setChartMonthIndex(i => Math.max(i - 1, 0));
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <Text style={[styles.heading, { color: theme.text }]}>Ringkasan</Text>

      <View style={[styles.totalCard, cardShadow, { backgroundColor: theme.surface }]}>
        <Text style={[styles.total, tabularNums, { color: theme.text }]}>{formatRupiah(overallTotal)}</Text>
        <Text style={[styles.totalLabel, { color: theme.textMuted }]}>Total pengeluaran</Text>
      </View>

      <View style={[styles.modeToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {(
          [
            { value: 'category', label: 'Kategori' },
            { value: 'account', label: 'Akun' },
          ] as const
        ).map(option => {
          const active = mode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setMode(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: active }}
              style={[styles.modeButton, { backgroundColor: active ? theme.primary : theme.surface }]}
            >
              <Text style={[styles.modeButtonText, { color: active ? theme.primaryText : theme.textMuted }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {chartSection ? (
        <View style={[styles.chartCard, cardShadow, { backgroundColor: theme.surface }]}>
          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={handleOlderMonth}
              disabled={!hasOlderMonth}
              accessibilityRole="button"
              accessibilityLabel="Bulan sebelumnya"
              hitSlop={8}
            >
              <Icon name="chevron-left" size={20} color={hasOlderMonth ? theme.text : theme.textDisabled} />
            </TouchableOpacity>
            <Text style={[styles.chartHeading, { color: theme.text }]}>
              {mode === 'category' ? 'Kategori' : 'Akun'} · {chartSection.title}
            </Text>
            <TouchableOpacity
              onPress={handleNewerMonth}
              disabled={!hasNewerMonth}
              accessibilityRole="button"
              accessibilityLabel="Bulan berikutnya"
              hitSlop={8}
            >
              <Icon name="chevron-right" size={20} color={hasNewerMonth ? theme.text : theme.textDisabled} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartRow}>
            <CategoryDonutChart
              data={chartSection.data.map(row => ({ key: row.id, amount: row.amount, color: row.color }))}
              total={chartSection.total}
              trackColor={theme.border}
              centerLabelColor={theme.textMuted}
              centerValueColor={theme.text}
            />
            <View style={styles.legend}>
              {chartSection.data.map(item => (
                <View key={item.id} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendLabel, { color: theme.text }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.legendPercent, tabularNums, { color: theme.textMuted }]}>
                    {chartSection.total > 0 ? Math.round((item.amount / chartSection.total) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.listRow}>
            <View style={styles.listLeft}>
              {item.icon ? (
                <View style={[styles.iconBadge, { backgroundColor: `${item.color}26` }]}>
                  <Icon name={item.icon} size={18} color={item.color} />
                </View>
              ) : (
                <View style={[styles.iconBadge, { backgroundColor: item.color }]} />
              )}
              <Text style={[styles.listLabel, { color: theme.text }]} numberOfLines={1}>
                {item.label}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
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
  modeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 2,
    marginBottom: spacing.md,
  },
  modeButton: {
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  chartHeading: { ...typography.h2, fontSize: 14, marginHorizontal: spacing.sm },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legend: {
    flex: 1,
    marginLeft: spacing.md,
    gap: spacing['2xs'],
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing['2xs'],
  },
  legendLabel: { ...typography.caption, flex: 1, flexShrink: 1 },
  legendPercent: { ...typography.caption, fontWeight: '600', marginLeft: spacing['2xs'] },
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
