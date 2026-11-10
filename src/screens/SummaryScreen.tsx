import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryDonutChart } from '../components/CategoryDonutChart';
import { Icon } from '../components/Icon';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { getExpenseBreakdownByMonth, MonthlyExpenseBreakdown } from '../services/expenseService';
import { formatRupiah } from '../utils/format';
import { BreakdownMode, buildMonthSections } from '../utils/summaryBreakdown';

export function SummaryScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  // The breakdown below covers every expense ever recorded (grouped by month), but as an
  // already-aggregated RPC result rather than every raw expense row — see ROADMAP's "Move the
  // totals and Summary breakdown to server-side aggregates".
  const [breakdownRows, setBreakdownRows] = useState<MonthlyExpenseBreakdown[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<BreakdownMode>('category');

  useEffect(() => {
    getExpenseBreakdownByMonth().then(setBreakdownRows).catch((error: any) => {
      Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    getExpenseBreakdownByMonth()
      .then(setBreakdownRows)
      .catch((error: any) => {
        Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
      })
      .finally(() => setRefreshing(false));
  }, []);

  const sections = useMemo(() => buildMonthSections(breakdownRows, mode), [breakdownRows, mode]);
  const overallTotal = useMemo(() => sections.reduce((sum, s) => sum + s.total, 0), [sections]);

  // Index into `sections`, which `buildMonthSections` keeps in the RPC's newest-first month
  // order — so 0 is the latest month and it's the default.
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
            <Text style={[styles.sectionTotal, tabularNums, { color: theme.textMuted }]}>
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
