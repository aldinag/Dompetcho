import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmountInput } from '../components/AmountInput';
import { CategoryPicker } from '../components/CategoryPicker';
import { Icon } from '../components/Icon';
import { DEFAULT_RECEIPT_CATEGORY_NAME } from '../constants/categories';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useReceiptProcessor } from '../hooks/useReceiptProcessor';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import { confirmReceiptScan, discardReceiptScan } from '../services/receiptImportService';
import { createExpense } from '../services/expenseService';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { Expense, ExpenseSource, TransactionType } from '../types';
import { formatDayHeader } from '../utils/format';
import { nowTimestamp, withPickedDay } from '../utils/timestamp';

type Route = RouteProp<RootStackParamList, 'ExpenseForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExpenseFormScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params;

  const user = useAuthStore(state => state.user);
  const categories = useExpenseStore(state => state.categories);
  const addExpenseOptimistic = useExpenseStore(state => state.addExpenseOptimistic);
  const replaceExpense = useExpenseStore(state => state.replaceExpense);
  const removeExpense = useExpenseStore(state => state.removeExpense);

  const isReceiptFlow = !!params?.receiptScanId;
  const defaultCategoryId =
    categories.find(c => c.name === DEFAULT_RECEIPT_CATEGORY_NAME)?.id ?? null;

  const [amount, setAmount] = useState<number | null>(params?.prefill?.amount ?? null);
  const [date, setDate] = useState<string>(params?.prefill?.date ?? nowTimestamp());
  const [categoryId, setCategoryId] = useState<string | null>(isReceiptFlow ? defaultCategoryId : null);
  const [note, setNote] = useState<string>(params?.prefill?.recipientName ?? '');
  // Receipts are always an outgoing transfer — the toggle only makes sense for manual entry.
  const [type, setType] = useState<TransactionType>('expense');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const processReceiptImage = useReceiptProcessor();

  function resetForm() {
    setAmount(null);
    setDate(nowTimestamp());
    setCategoryId(null);
    setNote('');
    setType('expense');
  }

  // The "Add" tab reuses this same screen with no params — clear any leftover state
  // from a previous manual entry each time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      if (!isReceiptFlow) resetForm();
    }, [isReceiptFlow]),
  );

  async function handleSave() {
    if (!user) return;
    if (amount === null || amount <= 0) {
      Alert.alert('Nominal wajib diisi', 'Masukkan nominal sebelum menyimpan.');
      return;
    }

    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticExpense: Expense = {
      id: tempId,
      user_id: user.id,
      amount,
      category_id: categoryId,
      note: note || null,
      date,
      source: isReceiptFlow ? 'receipt_ocr' : 'manual',
      type,
      created_at: new Date().toISOString(),
      category: categories.find(c => c.id === categoryId) ?? null,
    };
    addExpenseOptimistic(optimisticExpense);
    ReactNativeHapticFeedback.trigger('notificationSuccess');

    // Navigate away immediately so saving feels instant; a failure below is surfaced
    // via an alert and the optimistic row is rolled back.
    if (isReceiptFlow) {
      navigation.goBack();
    } else {
      resetForm();
    }

    try {
      const source: ExpenseSource = isReceiptFlow ? 'receipt_ocr' : 'manual';
      const input = {
        userId: user.id,
        amount,
        categoryId,
        note: note || null,
        date,
        source,
        type,
      };
      const real = isReceiptFlow
        ? await confirmReceiptScan(params!.receiptScanId!, input)
        : await createExpense(input);
      replaceExpense(tempId, real);
    } catch (error: any) {
      removeExpense(tempId);
      Alert.alert('Gagal menyimpan pengeluaran', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  function handleUploadReceipt() {
    Alert.alert('Unggah struk', 'Tambahkan tangkapan layar struk Mandiri', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Pilih dari Galeri',
        onPress: async () => {
          const result = await launchImageLibrary({ mediaType: 'photo' });
          const uri = result.assets?.[0]?.uri;
          if (uri) processReceiptImage(uri);
        },
      },
      {
        text: 'Ambil Foto',
        onPress: async () => {
          const result = await launchCamera({ mediaType: 'photo' });
          const uri = result.assets?.[0]?.uri;
          if (uri) processReceiptImage(uri);
        },
      },
    ]);
  }

  async function handleDiscard() {
    if (!params?.receiptScanId) return;
    Alert.alert('Buang struk?', 'Tidak akan ada pengeluaran yang dibuat dari struk ini.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buang',
        style: 'destructive',
        onPress: async () => {
          try {
            await discardReceiptScan(params.receiptScanId!);
          } finally {
            navigation.goBack();
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      // As a tab (no header) this needs the top inset itself; when pushed with a header
      // (the receipt-review modal) the header already accounts for it, so this is a no-op there.
      edges={isReceiptFlow ? ['bottom'] : ['top', 'bottom']}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {isReceiptFlow && (
            <View style={[styles.receiptBanner, { backgroundColor: theme.background, borderColor: theme.border }]}>
              {params?.imageUri && <Image source={{ uri: params.imageUri }} style={styles.thumbnail} />}
              <Text style={[styles.receiptBannerText, { color: theme.text }]}>
                {params?.bankDetected === 'mandiri'
                  ? 'Terdeteksi dari struk Mandiri — periksa nominal dan detail di bawah, semua bisa diubah.'
                  : 'Struk ini tidak bisa dibaca otomatis — isi detailnya secara manual di bawah.'}
              </Text>
            </View>
          )}

          <AmountInput value={amount} onChangeValue={setAmount} autoFocus={!isReceiptFlow} />

          {!isReceiptFlow && (
            <View style={[styles.typeToggle, { borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.typeOption, type === 'expense' && { backgroundColor: theme.primary }]}
                onPress={() => setType('expense')}
                accessibilityRole="button"
                accessibilityState={{ selected: type === 'expense' }}
              >
                <Text style={[styles.typeOptionText, { color: type === 'expense' ? theme.primaryText : theme.text }]}>
                  Pengeluaran
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, type === 'income' && { backgroundColor: theme.primary }]}
                onPress={() => setType('income')}
                accessibilityRole="button"
                accessibilityState={{ selected: type === 'income' }}
              >
                <Text style={[styles.typeOptionText, { color: type === 'income' ? theme.primaryText : theme.text }]}>
                  Pemasukan
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isReceiptFlow && (
            <TouchableOpacity
              style={[styles.uploadButton, { borderColor: theme.border }]}
              onPress={handleUploadReceipt}
              accessibilityRole="button"
              accessibilityLabel="Unggah struk"
            >
              <Icon name="camera" size={16} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Unggah struk Mandiri</Text>
            </TouchableOpacity>
          )}

          <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

          <View style={[styles.formCard, cardShadow, { backgroundColor: theme.surface }]}>
            <View style={styles.formRow}>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Catatan</Text>
              <TextInput
                style={[styles.noteInput, { color: theme.text }]}
                value={note}
                onChangeText={setNote}
                placeholder={isReceiptFlow ? 'Nama penerima' : 'Catatan (opsional)'}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Ubah tanggal"
            >
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Tanggal</Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>{formatDayHeader(date)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_event, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(withPickedDay(date, selected));
              }}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {isReceiptFlow && (
            <TouchableOpacity
              style={[styles.button, styles.discardButton, { borderColor: theme.danger }]}
              onPress={handleDiscard}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Buang</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 16 }}>
                {isReceiptFlow ? 'Konfirmasi' : 'Simpan'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingBottom: spacing.lg },
  receiptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  receiptBannerText: {
    ...typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
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
  uploadButton: {
    flexDirection: 'row',
    gap: spacing['2xs'],
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  formRow: {
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing['2xs'] + 2,
  },
  noteInput: {
    padding: 0,
    fontSize: 15,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  discardButton: {
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
  },
});
