import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { Account, AccountKind } from '../types';

const KIND_LABELS: Record<AccountKind, string> = {
  bank: 'Bank',
  ewallet: 'E-Wallet',
  cash: 'Tunai',
};
const KINDS: AccountKind[] = ['bank', 'ewallet', 'cash'];

export function ManageAccountsScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const user = useAuthStore(state => state.user);
  const accounts = useExpenseStore(state => state.accounts);
  const loading = useExpenseStore(state => state.loading);
  const addAccount = useExpenseStore(state => state.addAccount);
  const renameAccount = useExpenseStore(state => state.renameAccount);
  const removeAccount = useExpenseStore(state => state.removeAccount);
  const loadInitial = useExpenseStore(state => state.loadInitial);

  useEffect(() => {
    if (accounts.length === 0) loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKind, setEditKind] = useState<AccountKind>('bank');
  const [savingEdit, setSavingEdit] = useState(false);

  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<AccountKind>('bank');
  const [adding, setAdding] = useState(false);

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditName(account.name);
    setEditKind(account.kind);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await renameAccount(editingId, editName.trim(), editKind);
      setEditingId(null);
    } catch (error: any) {
      Alert.alert('Gagal menyimpan akun', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setSavingEdit(false);
    }
  }

  function confirmDelete(account: Account) {
    Alert.alert(
      'Hapus akun?',
      `"${account.name}" akan dihapus. Pengeluaran yang sudah ditandai akun ini tidak ikut terhapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAccount(account.id);
            } catch (error: any) {
              Alert.alert('Gagal menghapus akun', error?.message ?? 'Silakan coba lagi.');
            }
          },
        },
      ],
    );
  }

  async function handleAdd() {
    if (!user || !newName.trim()) return;
    setAdding(true);
    try {
      await addAccount(user.id, newName.trim(), newKind);
      setNewName('');
      setNewKind('bank');
    } catch (error: any) {
      Alert.alert('Gagal menambah akun', error?.message ?? 'Silakan coba lagi.');
    } finally {
      setAdding(false);
    }
  }

  function renderKindChips(selected: AccountKind, onSelect: (kind: AccountKind) => void) {
    return (
      <View style={styles.kindRow}>
        {KINDS.map(kind => {
          const active = kind === selected;
          return (
            <TouchableOpacity
              key={kind}
              onPress={() => onSelect(kind)}
              accessibilityRole="button"
              accessibilityLabel={KIND_LABELS[kind]}
              accessibilityState={{ selected: active }}
              style={[
                styles.kindChip,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.kindChipText, { color: active ? theme.primaryText : theme.text }]}>
                {KIND_LABELS[kind]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.emptyState} color={theme.primary} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Belum ada akun. Tambahkan akun pertama di bawah — mis. "Mandiri", "GoPay", atau "Tunai".
            </Text>
          )
        }
        renderItem={({ item }) => {
          const isEditing = editingId === item.id;
          return (
            <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
              {isEditing ? (
                <>
                  <TextInput
                    style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nama akun"
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                  />
                  {renderKindChips(editKind, setEditKind)}
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
                      disabled={savingEdit || !editName.trim()}
                      accessibilityRole="button"
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionTextBold, { color: theme.primary }]}>Simpan</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={[styles.accountName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.accountKind, { color: theme.textMuted }]}>{KIND_LABELS[item.kind]}</Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => startEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ubah ${item.name}`}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionText, { color: theme.primary }]}>Ubah</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${item.name}`}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionText, { color: theme.danger }]}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
            <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Tambah Akun</Text>
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nama akun (mis. Mandiri, GoPay, Tunai)"
              placeholderTextColor={theme.textMuted}
            />
            {renderKindChips(newKind, setNewKind)}
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: theme.primary },
                (!newName.trim() || adding) && styles.buttonDisabled,
              ]}
              onPress={handleAdd}
              disabled={!newName.trim() || adding}
              accessibilityRole="button"
              accessibilityLabel="Tambah akun"
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
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    lineHeight: 20,
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
  },
  accountName: {
    ...typography.h2,
  },
  accountKind: {
    ...typography.caption,
    marginTop: spacing['2xs'],
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
  nameInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  kindRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  kindChip: {
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
