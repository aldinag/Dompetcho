import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

export function EmptyState() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🧾</Text>
      <Text style={[styles.title, { color: theme.text }]}>Belum ada pengeluaran</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Punya struk transfer Livin' by Mandiri? Bagikan tangkapan layarnya langsung ke Dompetcho dari
        Galeri atau WhatsApp — nominal dan detailnya akan terbaca otomatis.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    ...typography.h1,
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
  },
});
