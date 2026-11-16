import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

interface UndoSnackbarProps {
  message: string;
  onUndo: () => void;
  bottom: number;
}

export function UndoSnackbar({ message, onUndo, bottom }: UndoSnackbarProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      <View style={[styles.bar, cardShadow, { backgroundColor: theme.text }]}>
        <Text style={[styles.message, { color: theme.background }]} numberOfLines={1}>
          {message}
        </Text>
        <TouchableOpacity onPress={onUndo} accessibilityRole="button" accessibilityLabel="Urungkan hapus" hitSlop={8}>
          <Text style={[styles.undo, { color: theme.primary }]}>Urungkan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.md,
  },
  message: {
    ...typography.body,
    flex: 1,
  },
  undo: {
    ...typography.body,
    fontWeight: '700',
  },
});
