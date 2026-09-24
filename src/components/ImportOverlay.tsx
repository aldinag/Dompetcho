import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useImportStore } from '../store/useImportStore';

export function ImportOverlay() {
  const theme = useTheme();
  const processing = useImportStore(state => state.processing);

  return (
    <Modal visible={processing} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.text, { color: theme.text }]}>Membaca struk…</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    minWidth: 160,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
