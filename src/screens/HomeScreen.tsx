import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryFilterBar } from '../components/CategoryFilterBar';
import { EmptyState } from '../components/EmptyState';
import { ExpenseListItem } from '../components/ExpenseListItem';
import { Icon } from '../components/Icon';
import { tintedShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { greeting } from '../utils/dateRange';
import { formatRupiah } from '../utils/format';
import { groupByDay } from '../utils/groupExpenses';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('default');
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const expenses = useExpenseStore(state => state.expenses);
  const hasMoreExpenses = useExpenseStore(state => state.hasMoreExpenses);
  const loadingMoreExpenses = useExpenseStore(state => state.loadingMoreExpenses);
  const categories = useExpenseStore(state => state.categories);
  const categoryFilterId = useExpenseStore(state => state.categoryFilterId);
  const balance = useExpenseStore(state => state.balance);
  const monthIncome = useExpenseStore(state => state.monthIncome);
  const monthExpense = useExpenseStore(state => state.monthExpense);
  const refreshing = useExpenseStore(state => state.refreshing);
  const error = useExpenseStore(state => state.error);
  const isOffline = useExpenseStore(state => state.isOffline);
  const loadInitial = useExpenseStore(state => state.loadInitial);
  const refresh = useExpenseStore(state => state.refresh);
  const loadMoreExpenses = useExpenseStore(state => state.loadMoreExpenses);
  const setSearchQuery = useExpenseStore(state => state.setSearchQuery);
  const setCategoryFilter = useExpenseStore(state => state.setCategoryFilter);

  // loadInitial/refresh/loadMoreExpenses no longer need an Alert on failure — their error
  // (and whether it looked like a connectivity problem) lands in the store instead, and the
  // list's empty/footer slot and the offline banner below render it with a way to retry.
  useEffect(() => {
    loadInitial().catch(() => {});
  }, [loadInitial]);

  // The TextInput is bound to this local, un-debounced value so typing feels instant; the
  // store (and the server-side `ilike` query it triggers) only hears about it 350ms after
  // the user stops typing. Skips its own first run so mounting doesn't re-fetch what
  // `loadInitial` just fetched.
  const [searchInput, setSearchInput] = useState('');
  const isFirstSearchEffect = useRef(true);
  useEffect(() => {
    if (isFirstSearchEffect.current) {
      isFirstSearchEffect.current = false;
      return;
    }
    const handle = setTimeout(() => {
      setSearchQuery(searchInput).catch((err: any) => {
        Alert.alert('Gagal memuat data', err?.message ?? 'Silakan coba lagi.');
      });
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput, setSearchQuery]);

  const handleSelectCategoryFilter = useCallback(
    (categoryId: string | null) => {
      setCategoryFilter(categoryId).catch((err: any) => {
        Alert.alert('Gagal memuat data', err?.message ?? 'Silakan coba lagi.');
      });
    },
    [setCategoryFilter],
  );

  const isFiltering = searchInput.trim() !== '' || categoryFilterId !== null;

  const handleRefresh = useCallback(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    loadMoreExpenses().catch(() => {});
  }, [loadMoreExpenses]);

  const handleRetryInitial = useCallback(() => {
    loadInitial().catch(() => {});
  }, [loadInitial]);

  const sections = useMemo(() => groupByDay(expenses), [expenses]);

  const listHeader = (
    <>
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.warning }]}>
          <Icon name="warning" size={14} color={theme.heroText} />
          <Text style={[styles.offlineBannerText, { color: theme.heroText }]}>Tidak ada koneksi</Text>
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.greetingRow}
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel={`Buka profil ${user?.full_name ?? ''}`}
        >
          <View style={styles.greetingText}>
            <Text style={[styles.greeting, { color: theme.textMuted }]}>{greeting()},</Text>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {user?.full_name ?? user?.email ?? 'Pengguna'}
            </Text>
          </View>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.hero }]}>
              <Text style={[styles.avatarInitial, { color: theme.heroText }]}>
                {(user?.full_name ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.balanceCard, tintedShadow(theme.hero), { backgroundColor: theme.hero }]}>
        <Text style={[styles.balanceLabel, { color: theme.heroTextMuted }]}>Sisa Saldo</Text>
        <Text
          style={[styles.balanceAmount, tabularNums, { color: theme.heroText }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatRupiah(balance)}
        </Text>

        <Text style={[styles.periodLabel, { color: theme.heroTextMuted }]}>Bulan ini</Text>
        <View style={styles.splitRow}>
          <View style={[styles.splitPill, { backgroundColor: theme.heroOverlay }]}>
            <View style={styles.splitLabelRow}>
              <Icon name="arrow-up" size={14} color={theme.heroText} />
              <Text style={[styles.splitLabel, { color: theme.heroTextMuted }]}>Pemasukan</Text>
            </View>
            <Text
              style={[styles.splitAmount, tabularNums, { color: theme.heroText }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatRupiah(monthIncome)}
            </Text>
          </View>
          <View style={[styles.splitPill, { backgroundColor: theme.heroOverlay }]}>
            <View style={styles.splitLabelRow}>
              <Icon name="arrow-down" size={14} color={theme.heroText} />
              <Text style={[styles.splitLabel, { color: theme.heroTextMuted }]}>Pengeluaran</Text>
            </View>
            <Text
              style={[styles.splitAmount, tabularNums, { color: theme.heroText }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatRupiah(monthExpense)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.historyHeading, { color: theme.text }]}>Transaksi Terakhir</Text>

      <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Cari catatan..."
          placeholderTextColor={theme.textMuted}
          returnKeyType="search"
          accessibilityLabel="Cari transaksi berdasarkan catatan"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchInput('')}
            accessibilityRole="button"
            accessibilityLabel="Hapus pencarian"
            hitSlop={8}
          >
            <Icon name="close" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <CategoryFilterBar categories={categories} selectedId={categoryFilterId} onSelect={handleSelectCategoryFilter} />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ExpenseListItem expense={item} />}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.title}</Text>
            <Text style={[styles.sectionSubtotal, tabularNums, { color: theme.textMuted }]}>
              {section.subtotal >= 0 ? '+' : '-'} {formatRupiah(Math.abs(section.subtotal))}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          isFiltering ? (
            <EmptyState
              icon={<Icon name="search" size={40} color={theme.textMuted} />}
              title="Tidak ada hasil"
              body="Coba kata kunci atau kategori lain."
            />
          ) : error ? (
            <View style={styles.errorState}>
              <Icon name="warning" size={40} color={theme.danger} />
              <Text style={[styles.errorTitle, { color: theme.text }]}>Gagal memuat data</Text>
              <Text style={[styles.errorBody, { color: theme.textMuted }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.outlineButton, { borderColor: theme.border }]}
                onPress={handleRetryInitial}
                accessibilityRole="button"
                accessibilityLabel="Coba lagi memuat data"
              >
                <Text style={[styles.outlineButtonText, { color: theme.primary }]}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState />
          )
        }
        ListFooterComponent={
          hasMoreExpenses ? (
            <View>
              {error && !loadingMoreExpenses && (
                <Text style={[styles.footerErrorText, { color: theme.danger }]}>{error}</Text>
              )}
              <TouchableOpacity
                style={[styles.outlineButton, { borderColor: theme.border }]}
                onPress={handleLoadMore}
                disabled={loadingMoreExpenses}
                accessibilityRole="button"
                accessibilityLabel={error ? 'Coba lagi memuat transaksi' : 'Muat transaksi lebih lama'}
              >
                {loadingMoreExpenses ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <Text style={[styles.outlineButtonText, { color: theme.primary }]}>
                    {error ? 'Coba Lagi' : 'Muat Lebih Banyak'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : undefined
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.listContent, sections.length === 0 && styles.emptyContent]}
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
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
  },
  name: {
    ...typography.h1,
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
    ...typography.h2,
  },
  // One focal element: a single blue card on the plain background. Padding follows the 4/8
  // grid; the balance is the largest thing on screen, its label and the split pills below it
  // step down in size and opacity.
  balanceCard: {
    marginHorizontal: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  balanceLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 40,
    marginTop: spacing['2xs'],
  },
  periodLabel: {
    ...typography.caption,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  splitPill: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  splitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  splitLabel: {
    ...typography.caption,
  },
  splitAmount: {
    ...typography.h2,
    marginTop: spacing['2xs'],
  },
  historyHeading: {
    ...typography.h1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtotal: {
    ...typography.caption,
    fontWeight: '600',
  },
  // Clears the lifted "+" tab button so the last row isn't tucked under it.
  listContent: {
    paddingBottom: spacing['2xl'],
  },
  emptyContent: {
    flexGrow: 1,
  },
  // Shared by the footer's "Muat Lebih Banyak"/"Coba Lagi" button and the empty-state retry
  // button — same outlined pill either way.
  outlineButton: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2xs'],
    paddingVertical: spacing.xs,
  },
  offlineBannerText: {
    ...typography.caption,
    fontWeight: '600',
  },
  errorState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  errorTitle: {
    ...typography.h1,
    marginTop: spacing.sm,
    marginBottom: spacing['2xs'],
  },
  errorBody: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  footerErrorText: {
    ...typography.caption,
    textAlign: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
