import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { Image, RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyState';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { Icon } from '../components/Icon';
import { floatingCardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { Expense } from '../types';
import { currentMonthRange, greeting } from '../utils/dateRange';
import { formatDayHeader, formatRupiah } from '../utils/format';
import { localDayKey } from '../utils/timestamp';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DaySection {
  title: string;
  isoDate: string;
  subtotal: number;
  data: Expense[];
}

function groupByDay(expenses: Expense[]): DaySection[] {
  const sections: DaySection[] = [];
  const indexByDate = new Map<string, number>();

  for (const expense of expenses) {
    const dayKey = localDayKey(expense.date);
    let index = indexByDate.get(dayKey);
    if (index === undefined) {
      index = sections.length;
      indexByDate.set(dayKey, index);
      sections.push({ title: formatDayHeader(expense.date), isoDate: dayKey, subtotal: 0, data: [] });
    }
    sections[index].data.push(expense);
    // Net for the day — income adds, expense subtracts — now that both exist.
    sections[index].subtotal += expense.type === 'income' ? Number(expense.amount) : -Number(expense.amount);
  }

  return sections;
}

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('onPrimary');
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const expenses = useExpenseStore(state => state.expenses);
  const refreshing = useExpenseStore(state => state.refreshing);
  const loadInitial = useExpenseStore(state => state.loadInitial);
  const refresh = useExpenseStore(state => state.refresh);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const sections = useMemo(() => groupByDay(expenses), [expenses]);

  const monthSummary = useMemo(() => {
    const { start, end } = currentMonthRange();
    let incomeTotal = 0;
    let expenseTotal = 0;
    for (const e of expenses) {
      const at = new Date(e.date).getTime();
      if (at < start || at >= end) continue;
      const amount = Number(e.amount);
      if (e.type === 'income') incomeTotal += amount;
      else expenseTotal += amount;
    }
    return { incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal };
  }, [expenses]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.greetingRow}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel={`Buka profil ${user?.full_name ?? ''}`}
        >
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {user?.full_name ?? user?.email ?? 'Pengguna'}
            </Text>
          </View>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primaryText }]}>
              <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                {(user?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.balanceCard, floatingCardShadow, { backgroundColor: theme.primaryDark }]}>
        <Text style={styles.balanceLabel}>Sisa Saldo</Text>
        <Text style={[styles.balanceAmount, tabularNums]}>{formatRupiah(monthSummary.balance)}</Text>

        <View style={styles.divider} />

        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <View style={styles.splitIconBadge}>
              <Icon name="arrow-up" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.splitLabel}>Pemasukan Bulan Ini</Text>
              <Text style={[styles.splitAmount, tabularNums]}>{formatRupiah(monthSummary.incomeTotal)}</Text>
            </View>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitItem}>
            <View style={styles.splitIconBadge}>
              <Icon name="arrow-down" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.splitLabel}>Pengeluaran Bulan Ini</Text>
              <Text style={[styles.splitAmount, tabularNums]}>{formatRupiah(monthSummary.expenseTotal)}</Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.historyHeading, { color: theme.text }]}>Transaksi Terakhir</Text>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ExpenseListItem expense={item} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            <Text
              style={[
                styles.sectionSubtotal,
                tabularNums,
                { color: section.subtotal >= 0 ? theme.success : theme.danger },
              ]}
            >
              {section.subtotal >= 0 ? '+' : '-'} {formatRupiah(Math.abs(section.subtotal))}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={sections.length === 0 && styles.emptyContent}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    // Matches balanceCard's negative marginTop below — this padding is the space the
    // card's top half sits over, so exactly half the card overlaps the color and half
    // sits on the plain background beneath.
    paddingBottom: 76,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  greetingText: {
    flexShrink: 1,
  },
  greeting: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  name: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: spacing.sm,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  balanceCard: {
    // Pulled up by roughly half its own height so the header's rounded edge cuts through
    // its middle — it straddles the colored header and the plain background below, rather
    // than sitting fully inside either (matches the reference's floating-card treatment).
    marginHorizontal: spacing.md,
    marginTop: -76,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  balanceLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    ...typography.display,
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    marginTop: spacing['2xs'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.sm,
  },
  splitRow: {
    flexDirection: 'row',
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  splitDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.sm,
  },
  splitLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  splitAmount: {
    ...typography.h2,
    color: '#FFFFFF',
    marginTop: 2,
  },
  historyHeading: {
    ...typography.h1,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
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
  sectionSubtotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContent: {
    flexGrow: 1,
  },
});
