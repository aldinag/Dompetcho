import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountInput } from '../components/AmountInput';
import { CategoryDonutChart } from '../components/CategoryDonutChart';
import { Icon } from '../components/Icon';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { clearCategoryBudget, listCategoryBudgets, setCategoryBudget } from '../services/budgetService';
import { getExpenseBreakdownByMonth, MonthlyExpenseBreakdown } from '../services/expenseService';
import { useAuthStore } from '../store/useAuthStore';
import { CategoryBudget } from '../types';
import { budgetProgress, formatBudgetProgressLabel } from '../utils/budgetProgress';
import { formatRupiah } from '../utils/format';
import { BreakdownMode, buildMonthSections } from '../utils/summaryBreakdown';

export function SummaryScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const user = useAuthStore(state => state.user);
  // The breakdown below covers every expense ever recorded (grouped by month), but as an
  // already-aggregated RPC result rather than every raw expense row — see ROADMAP's "Move the
  // totals and Summary breakdown to server-side aggregates".
  const [breakdownRows, setBreakdownRows] = useState<MonthlyExpenseBreakdown[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<BreakdownMode>('category');

  useEffect(() => {
    getExpenseBreakdownByMonth().then(setBreakdownRows).catch((error: any) => {
      Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
    });
    listCategoryBudgets().catch((error: any) => {
      Alert.alert('Gagal memuat anggaran', error?.message ?? 'Silakan coba lagi.');
      return [];
    }).then(result => result && setBudgets(result));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([getExpenseBreakdownByMonth(), listCategoryBudgets()])
      .then(([rows, budgetRows]) => {
        setBreakdownRows(rows);
        setBudgets(budgetRows);
      })
      .catch((error: any) => {
        Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
      })
      .finally(() => setRefreshing(false));
  }, []);

  const budgetByCategoryId = useMemo(() => {
    const map = new Map<string, CategoryBudget>();
    for (const b of budgets) map.set(b.category_id, b);
    return map;
  }, [budgets]);

  // Which category's budget editor is open, if any — only one at a time.
  const [editingBudgetCategoryId, setEditingBudgetCategoryId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<number | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);

  function openBudgetEditor(categoryId: string) {
    setEditingBudgetCategoryId(categoryId);
    setEditingBudgetValue(budgetByCategoryId.get(categoryId)?.monthly_limit ?? null);
  }

  function closeBudgetEditor() {
    setEditingBudgetCategoryId(null);
    setEditingBudgetValue(null);
  }

  async function saveBudgetEditor() {
    if (!editingBudgetCategoryId || !user) return;
    setSavingBudget(true);
    try {
      if (editingBudgetValue === null || editingBudgetValue <= 0) {
        await clearCategoryBudget(editingBudgetCategoryId);
        setBudgets(prev => prev.filter(b => b.category_id !== editingBudgetCategoryId));
      } else {
        const saved = await setCategoryBudget(user.id, editingBudgetCategoryId, editingBudgetValue);
        setBudgets(prev => [...prev.filter(b => b.category_id !== editingBudgetCategoryId), saved]);
      }
      closeBudgetEditor();
    } catch (error: any) {
      Alert.alert('Gagal menyimpan anggaran', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setSavingBudget(false);
    }
  }

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

  const listHeader = (
    <>
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
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item, section }) => {
          // Budgets are per category, and only shown for the chart's selected month — the
          // month-grouped list otherwise covers every month ever recorded, and a limit is a
          // recurring "this month" concept, not something worth re-showing against old months.
          // "uncategorized" is a synthetic row (see utils/summaryBreakdown.ts), not a real
          // category, so it has no `category_budgets` row to attach a limit to.
          const canBudget = mode === 'category' && section.key === chartSection?.key && item.id !== 'uncategorized';
          const budget = canBudget ? budgetByCategoryId.get(item.id) : undefined;
          const isEditing = editingBudgetCategoryId === item.id;
          const progress = budget ? budgetProgress(item.amount, budget.monthly_limit) : null;
          const progressColor = progress
            ? { neutral: theme.primary, warning: theme.warning, danger: theme.danger }[progress.status]
            : theme.primary;

          return (
            <View style={styles.itemContainer}>
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

              {canBudget && !isEditing && (
                <View style={styles.budgetBlock}>
                  {budget ? (
                    <>
                      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(progress!.percent, 100)}%`, backgroundColor: progressColor },
                          ]}
                        />
                      </View>
                      <View style={styles.budgetRow}>
                        <Text style={[styles.budgetText, tabularNums, { color: theme.textMuted }]}>
                          {formatBudgetProgressLabel(item.amount, budget.monthly_limit)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => openBudgetEditor(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Ubah anggaran ${item.label}`}
                          hitSlop={8}
                        >
                          <Text style={[styles.budgetAction, { color: theme.primary }]}>Ubah</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openBudgetEditor(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Atur anggaran ${item.label}`}
                      style={styles.setBudgetButton}
                    >
                      <Text style={[styles.budgetAction, { color: theme.primary }]}>Atur anggaran</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {canBudget && isEditing && (
                <View style={styles.budgetEditor}>
                  <Text style={[styles.budgetEditorLabel, { color: theme.textMuted }]}>
                    Anggaran bulanan — {item.label}
                  </Text>
                  <AmountInput value={editingBudgetValue} onChangeValue={setEditingBudgetValue} autoFocus />
                  <View style={styles.budgetEditorActions}>
                    <TouchableOpacity onPress={closeBudgetEditor} accessibilityRole="button" style={styles.budgetEditorButton}>
                      <Text style={[styles.budgetAction, { color: theme.textMuted }]}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveBudgetEditor}
                      disabled={savingBudget}
                      accessibilityRole="button"
                      style={styles.budgetEditorButton}
                    >
                      {savingBudget ? (
                        <ActivityIndicator color={theme.primary} />
                      ) : (
                        <Text style={[styles.budgetAction, styles.budgetActionBold, { color: theme.primary }]}>Simpan</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
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
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
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
  itemContainer: {
    paddingHorizontal: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
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
  budgetBlock: {
    marginLeft: 36 + spacing.sm, // align under the label, past the icon badge
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing['2xs'],
  },
  budgetText: { ...typography.caption },
  budgetAction: { ...typography.caption, fontWeight: '600' },
  budgetActionBold: { fontWeight: '700' },
  setBudgetButton: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  budgetEditor: {
    marginLeft: 36 + spacing.sm,
    marginBottom: spacing.sm,
  },
  budgetEditorLabel: { ...typography.caption, fontWeight: '700', marginBottom: spacing['2xs'] },
  budgetEditorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  budgetEditorButton: {
    minHeight: 36,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { flexGrow: 1 },
  empty: { ...typography.body, marginTop: spacing['4xl'], textAlign: 'center' },
});
