import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountPicker } from '../components/AccountPicker';
import { AmountInput } from '../components/AmountInput';
import { CategoryPicker } from '../components/CategoryPicker';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { SwipeableRow } from '../components/SwipeableRow';
import { categoryLabel } from '../constants/categoryLabels';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { tabularNums, typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import {
  createRecurringTransaction,
  deleteRecurringTransaction,
  listRecurringTransactions,
  updateRecurringTransaction,
} from '../services/recurringService';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { RecurringFrequency, RecurringTransaction, TransactionType } from '../types';
import { formatRupiah } from '../utils/format';
import { nextOccurrenceDate } from '../utils/recurringOccurrences';
import { localDayKey, nowTimestamp } from '../utils/timestamp';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Tiap minggu',
  monthly: 'Tiap bulan',
};
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'monthly'];

interface RuleFormValues {
  type: TransactionType;
  amount: number | null;
  categoryId: string | null;
  accountId: string | null;
  note: string;
  frequency: RecurringFrequency;
  anchorDate: string; // "yyyy-MM-dd"
}

function emptyFormValues(): RuleFormValues {
  return {
    type: 'expense',
    amount: null,
    categoryId: null,
    accountId: null,
    note: '',
    frequency: 'monthly',
    anchorDate: localDayKey(nowTimestamp()),
  };
}

function formValuesFromRule(rule: RecurringTransaction): RuleFormValues {
  return {
    type: rule.type,
    amount: Number(rule.amount),
    categoryId: rule.category_id,
    accountId: rule.account_id,
    note: rule.note ?? '',
    frequency: rule.frequency,
    anchorDate: rule.anchor_date,
  };
}

function dateToIsoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDay(isoDate: string): string {
  return parseIsoDay(isoDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ManageRecurringScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const categories = useExpenseStore(state => state.categories);
  const accounts = useExpenseStore(state => state.accounts);
  const loadInitial = useExpenseStore(state => state.loadInitial);

  useEffect(() => {
    if (categories.length === 0) {
      loadInitial().catch((error: any) => {
        Alert.alert('Gagal memuat data', error?.message ?? 'Silakan coba lagi.');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);

  useEffect(() => {
    listRecurringTransactions()
      .then(setRules)
      .catch((error: any) => {
        Alert.alert('Gagal memuat transaksi berulang', error?.message ?? 'Silakan coba lagi.');
      })
      .finally(() => setLoadingRules(false));
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<RuleFormValues>(emptyFormValues());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newValues, setNewValues] = useState<RuleFormValues>(emptyFormValues());
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [adding, setAdding] = useState(false);

  function startEdit(rule: RecurringTransaction) {
    setEditingId(rule.id);
    setEditValues(formValuesFromRule(rule));
    setShowEditDatePicker(false);
  }

  async function saveEdit() {
    if (!editingId || !user || editValues.amount === null || editValues.amount <= 0) return;
    const rule = rules.find(r => r.id === editingId);
    if (!rule) return;
    setSavingEdit(true);
    try {
      const updated = await updateRecurringTransaction(editingId, {
        userId: user.id,
        type: editValues.type,
        amount: editValues.amount,
        categoryId: editValues.categoryId,
        accountId: editValues.accountId,
        note: editValues.note.trim() || null,
        frequency: editValues.frequency,
        anchorDate: editValues.anchorDate,
        isActive: rule.is_active,
      });
      setRules(prev => prev.map(r => (r.id === editingId ? updated : r)));
      setEditingId(null);
    } catch (error: any) {
      Alert.alert('Gagal menyimpan perubahan', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(rule: RecurringTransaction) {
    try {
      const updated = await updateRecurringTransaction(rule.id, {
        userId: rule.user_id,
        type: rule.type,
        amount: Number(rule.amount),
        categoryId: rule.category_id,
        accountId: rule.account_id,
        note: rule.note,
        frequency: rule.frequency,
        anchorDate: rule.anchor_date,
        isActive: !rule.is_active,
      });
      setRules(prev => prev.map(r => (r.id === rule.id ? updated : r)));
    } catch (error: any) {
      Alert.alert('Gagal mengubah status', error?.message ?? 'Silakan coba lagi.');
    }
  }

  function confirmDelete(rule: RecurringTransaction) {
    Alert.alert(
      'Hapus transaksi berulang?',
      `"${rule.note || categoryLabel(categories.find(c => c.id === rule.category_id)?.name)}" tidak akan ditambahkan lagi secara otomatis.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringTransaction(rule.id);
              setRules(prev => prev.filter(r => r.id !== rule.id));
            } catch (error: any) {
              Alert.alert('Gagal menghapus', error?.message ?? 'Silakan coba lagi.');
            }
          },
        },
      ],
    );
  }

  async function handleAdd() {
    if (!user || newValues.amount === null || newValues.amount <= 0) return;
    setAdding(true);
    try {
      const created = await createRecurringTransaction({
        userId: user.id,
        type: newValues.type,
        amount: newValues.amount,
        categoryId: newValues.categoryId,
        accountId: newValues.accountId,
        note: newValues.note.trim() || null,
        frequency: newValues.frequency,
        anchorDate: newValues.anchorDate,
        isActive: true,
      });
      setRules(prev => [...prev, created]);
      setNewValues(emptyFormValues());
    } catch (error: any) {
      Alert.alert('Gagal menambah transaksi berulang', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setAdding(false);
    }
  }

  function renderTypeToggle(values: RuleFormValues, onChange: (values: RuleFormValues) => void) {
    return (
      <View style={[styles.typeToggle, { borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.typeOption, values.type === 'expense' && { backgroundColor: theme.primary }]}
          onPress={() => onChange({ ...values, type: 'expense' })}
          accessibilityRole="button"
          accessibilityState={{ selected: values.type === 'expense' }}
        >
          <Text style={[styles.typeOptionText, { color: values.type === 'expense' ? theme.primaryText : theme.text }]}>
            Pengeluaran
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, values.type === 'income' && { backgroundColor: theme.primary }]}
          onPress={() => onChange({ ...values, type: 'income' })}
          accessibilityRole="button"
          accessibilityState={{ selected: values.type === 'income' }}
        >
          <Text style={[styles.typeOptionText, { color: values.type === 'income' ? theme.primaryText : theme.text }]}>
            Pemasukan
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderFrequencyChips(values: RuleFormValues, onChange: (values: RuleFormValues) => void) {
    return (
      <View style={styles.frequencyRow}>
        {FREQUENCIES.map(frequency => {
          const active = frequency === values.frequency;
          return (
            <TouchableOpacity
              key={frequency}
              onPress={() => onChange({ ...values, frequency })}
              accessibilityRole="button"
              accessibilityLabel={FREQUENCY_LABELS[frequency]}
              accessibilityState={{ selected: active }}
              style={[
                styles.frequencyChip,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.frequencyChipText, { color: active ? theme.primaryText : theme.text }]}>
                {FREQUENCY_LABELS[frequency]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderForm(
    values: RuleFormValues,
    onChange: (values: RuleFormValues) => void,
    showDatePicker: boolean,
    setShowDatePicker: (show: boolean) => void,
  ) {
    return (
      <View>
        {renderTypeToggle(values, onChange)}
        <AmountInput value={values.amount} onChangeValue={amount => onChange({ ...values, amount })} />
        <CategoryPicker
          categories={categories}
          selectedId={values.categoryId}
          onSelect={categoryId => onChange({ ...values, categoryId })}
        />
        <AccountPicker
          accounts={accounts}
          selectedId={values.accountId}
          onSelect={accountId => onChange({ ...values, accountId })}
          onManage={() => navigation.navigate('ManageAccounts')}
        />
        <View style={[styles.formCard, cardShadow, { backgroundColor: theme.surface }]}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Catatan</Text>
          <TextInput
            style={[styles.noteInput, { color: theme.text }]}
            value={values.note}
            onChangeText={note => onChange({ ...values, note })}
            placeholder="Catatan (opsional)"
            placeholderTextColor={theme.textMuted}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Frekuensi</Text>
          {renderFrequencyChips(values, onChange)}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Ubah tanggal mulai"
          >
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Tanggal Mulai</Text>
            <Text style={[styles.dateValue, { color: theme.text }]}>{formatIsoDay(values.anchorDate)}</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={parseIsoDay(values.anchorDate)}
            mode="date"
            display="default"
            onChange={(_event, selected) => {
              setShowDatePicker(false);
              if (selected) onChange({ ...values, anchorDate: dateToIsoDay(selected) });
            }}
          />
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        data={rules}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loadingRules ? (
            <ActivityIndicator style={styles.emptyState} color={theme.primary} />
          ) : (
            <EmptyState
              title="Belum ada transaksi berulang"
              body="Tambahkan tagihan atau pemasukan rutin seperti kos atau gaji di bawah, dan Dompetcho akan mengingatkannya setiap kali jatuh tempo."
            />
          )
        }
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;
          if (isEditing) {
            return (
              <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
                {renderForm(editValues, setEditValues, showEditDatePicker, setShowEditDatePicker)}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() => setEditingId(null)}
                    accessibilityRole="button"
                    style={styles.actionButton}
                  >
                    <Text style={[styles.actionText, { color: theme.textMuted }]}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveEdit}
                    disabled={savingEdit || editValues.amount === null || editValues.amount <= 0}
                    accessibilityRole="button"
                    style={styles.actionButton}
                  >
                    {savingEdit ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      <Text style={[styles.actionTextBold, { color: theme.primary }]}>Simpan</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          const categoryName = categories.find(c => c.id === item.category_id)?.name;
          const isIncome = item.type === 'income';
          const amountColor = isIncome ? theme.success : theme.text;

          return (
            <SwipeableRow onDelete={() => confirmDelete(item)} deleteAccessibilityLabel={`Hapus ${item.note || categoryLabel(categoryName)}`}>
              <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={[styles.ruleTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.note || categoryLabel(categoryName)}
                    </Text>
                    <Text style={[styles.ruleSubtitle, { color: theme.textMuted }]}>
                      {FREQUENCY_LABELS[item.frequency]} · Berikutnya {formatIsoDay(nextOccurrenceDate({
                        frequency: item.frequency,
                        anchorDate: item.anchor_date,
                        lastPostedOn: item.last_posted_on,
                      }))}
                    </Text>
                  </View>
                  <Text style={[styles.amount, tabularNums, { color: amountColor }]}>
                    {isIncome ? '+' : '-'} {formatRupiah(item.amount)}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <View style={styles.row}>
                  <View style={styles.pauseRow}>
                    <Switch
                      value={item.is_active}
                      onValueChange={() => toggleActive(item)}
                      accessibilityLabel={item.is_active ? `Nonaktifkan ${item.note || categoryLabel(categoryName)}` : `Aktifkan ${item.note || categoryLabel(categoryName)}`}
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                    <Text style={[styles.pauseLabel, { color: theme.textMuted }]}>
                      {item.is_active ? 'Aktif' : 'Dijeda'}
                    </Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => startEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ubah ${item.note || categoryLabel(categoryName)}`}
                      style={styles.actionButton}
                    >
                      <Icon name="pencil" size={16} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${item.note || categoryLabel(categoryName)}`}
                      style={styles.actionButton}
                    >
                      <Icon name="trash" size={16} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </SwipeableRow>
          );
        }}
        ListFooterComponent={
          <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Tambah Transaksi Berulang</Text>
            {renderForm(newValues, setNewValues, showNewDatePicker, setShowNewDatePicker)}
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: theme.primary },
                (newValues.amount === null || newValues.amount <= 0 || adding) && styles.buttonDisabled,
              ]}
              onPress={handleAdd}
              disabled={newValues.amount === null || newValues.amount <= 0 || adding}
              accessibilityRole="button"
              accessibilityLabel="Tambah transaksi berulang"
            >
              {adding ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Text style={[styles.actionTextBold, { color: theme.primaryText }]}>Tambah</Text>
              )}
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyState: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing['2xs'],
  },
  ruleTitle: {
    ...typography.h2,
  },
  ruleSubtitle: {
    ...typography.caption,
    marginTop: spacing['2xs'],
  },
  amount: {
    ...typography.h2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pauseLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '600',
  },
  actionTextBold: {
    fontWeight: '700',
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  frequencyChip: {
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCard: {
    marginTop: spacing.sm,
  },
  noteInput: {
    padding: 0,
    fontSize: 15,
    minHeight: 32,
  },
  dateRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
