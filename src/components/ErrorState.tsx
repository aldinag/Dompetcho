import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

interface ErrorStateProps {
  /** The failure message to show — pass the "Tidak ada koneksi" wording when the caller
   *  already knows (via utils/networkError.ts) that the failure was a connectivity problem. */
  message: string;
  onRetry: () => void;
  retryAccessibilityLabel: string;
}

// Shared by every screen's "failed load, sitting blank" case (Home, Summary, Kelola Akun) so
// they all look and behave the same — see ROADMAP's "Consistent error handling on Summary and
// Kelola Akun".
export function ErrorState({ message, onRetry, retryAccessibilityLabel }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon name="warning" size={40} color={theme.danger} />
      <Text style={[styles.title, { color: theme.text }]}>Gagal memuat data</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{message}</Text>
      <TouchableOpacity
        style={[styles.button, { borderColor: theme.border }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={retryAccessibilityLabel}
      >
        <Text style={[styles.buttonText, { color: theme.primary }]}>Coba Lagi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  title: {
    ...typography.h1,
    marginTop: spacing.sm,
    marginBottom: spacing['2xs'],
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  button: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
});
