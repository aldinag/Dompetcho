import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/useAuthStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('onPrimary');
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);

  function confirmLogout() {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <View style={styles.backChevron}>
            <Icon name="chevron-right" size={22} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primaryText }]}>
            <Text style={[styles.avatarInitial, { color: theme.primary }]}>
              {(user.full_name ?? user.email ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user.full_name ?? 'Pengguna Dompetcho'}</Text>
        {!!user.email && <Text style={styles.email}>{user.email}</Text>}
      </View>

      <View style={styles.body}>
        <View style={[styles.card, cardShadow, { backgroundColor: theme.surface }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Tentang Dompetcho</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>Versi 1.0 (MVP1)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.card, styles.logoutCard, cardShadow, { backgroundColor: theme.surface }]}
          onPress={confirmLogout}
          accessibilityRole="button"
          accessibilityLabel="Keluar"
        >
          <Text style={[styles.logoutText, { color: theme.danger }]}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    borderBottomLeftRadius: radius.lg * 2,
    borderBottomRightRadius: radius.lg * 2,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing['2xs'],
    marginBottom: spacing.sm,
  },
  backChevron: {
    transform: [{ rotate: '180deg' }],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.sm,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  email: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing['2xs'],
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  row: {
    gap: spacing['2xs'],
  },
  rowLabel: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowValue: {
    ...typography.h2,
  },
  logoutCard: {
    alignItems: 'center',
  },
  logoutText: {
    ...typography.h2,
    fontWeight: '700',
  },
});
