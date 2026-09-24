import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';
import { useOnboardingStore } from '../store/useOnboardingStore';

export function OnboardingScreen() {
  const theme = useTheme();
  const markSeen = useOnboardingStore(state => state.markSeen);

  // RootNavigator swaps Onboarding for Login/Main reactively once `seen` flips to true —
  // no imperative navigation needed (and calling one here would race the screen swap).
  function handleGetStarted() {
    markSeen();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.primary }]}>
      <View style={styles.content}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.headline}>Catat Pengeluaran{'\n'}Lebih Cerdas</Text>
        <Text style={styles.body}>
          Bagikan struk transfer Mandiri, dan Dompetcho langsung mencatatnya untukmu —
          nyaris tanpa mengetik.
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primaryText }]}
        onPress={handleGetStarted}
        accessibilityRole="button"
        accessibilityLabel="Mulai"
      >
        <Text style={[styles.buttonText, { color: theme.primary }]}>Mulai</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  headline: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
