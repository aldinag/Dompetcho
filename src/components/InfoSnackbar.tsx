import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardShadow } from '../constants/elevation';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

// Same dark bar as `UndoSnackbar`, but a plain status message with no action button — there's
// nothing to undo (e.g. recurring transactions posted automatically on app open), so it just
// auto-dismisses after a few seconds.
const AUTO_DISMISS_MS = 4000;

interface InfoSnackbarProps {
  message: string;
  onDismiss: () => void;
  bottom: number;
}

export function InfoSnackbar({ message, onDismiss, bottom }: InfoSnackbarProps) {
  const theme = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="none">
      <View style={[styles.bar, cardShadow, { backgroundColor: theme.text }]}>
        <Text style={[styles.message, { color: theme.background }]} numberOfLines={1}>
          {message}
        </Text>
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    borderRadius: radius.md,
  },
  message: {
    ...typography.body,
    flex: 1,
  },
});
