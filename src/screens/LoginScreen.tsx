import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_POLICY_URL } from '../constants/links';
import { radius } from '../constants/radius';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useStatusBarStyle } from '../hooks/useStatusBarStyle';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/useAuthStore';

export function LoginScreen() {
  const theme = useTheme();
  useStatusBarStyle('default');
  const signingIn = useAuthStore(state => state.signingIn);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);

  async function handlePress() {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Gagal masuk', error?.message ?? 'Silakan coba lagi.');
    }
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      {/* Edge-to-edge Android doesn't resize the window for the keyboard, so the form has to
          make room itself: 'padding' shrinks the area above the keyboard, and the ScrollView
          lets the focused field be scrolled into view (also on screens too short to fit the
          whole form, where the tagline used to be overlapped by the Google button). */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <Text style={[styles.title, { color: theme.text }]}>Dompetcho</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Bagikan struk transfer Mandiri, catatan pengeluaran langsung jadi.
              Nyaris tanpa mengetik.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.primary },
              signingIn && styles.buttonDisabled,
            ]}
            onPress={handlePress}
            disabled={signingIn}
            accessibilityRole="button"
            accessibilityLabel="Masuk dengan Google"
          >
            {signingIn ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                Masuk dengan Google
              </Text>
            )}
          </TouchableOpacity>

          <EmailPasswordLogin />

          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Kebijakan Privasi"
          >
            <Text style={[styles.privacyLink, { color: theme.textMuted }]}>
              Kebijakan Privasi
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Email/password sign-in — a fallback for devices without Google Play Services (e.g.
 * Huawei phones), where the native Google Sign-In SDK can't work at all. Shown on every
 * build, not just dev. Toggles between signing in to an existing account ("Masuk") and
 * self-serve sign-up ("Daftar") via `supabase.auth.signUp`.
 */
function EmailPasswordLogin() {
  const theme = useTheme();
  const signingIn = useAuthStore(state => state.signingIn);
  const signInWithPassword = useAuthStore(state => state.signInWithPassword);
  const signUpWithPassword = useAuthStore(state => state.signUpWithPassword);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  async function handlePress() {
    try {
      if (mode === 'signIn') {
        await signInWithPassword(email.trim(), password);
      } else {
        const signedInImmediately = await signUpWithPassword(
          email.trim(),
          password,
        );
        if (!signedInImmediately) {
          Alert.alert(
            'Cek email Anda',
            'Tautan konfirmasi telah dikirim ke email Anda. Buka tautan itu, lalu masuk di sini.',
          );
          setMode('signIn');
          setPassword('');
        }
      }
    } catch (error: any) {
      Alert.alert(
        mode === 'signIn' ? 'Gagal masuk' : 'Gagal daftar',
        error?.message ?? 'Periksa email/password dan coba lagi.',
      );
    }
  }

  return (
    <View style={styles.emailBlock}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textMuted }]}>
          {mode === 'signIn'
            ? 'atau masuk dengan email'
            : 'atau daftar dengan email'}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
      <TextInput
        style={[
          styles.emailInput,
          { color: theme.text, borderColor: theme.border },
        ]}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
        accessibilityLabel="Email"
      />
      <TextInput
        ref={passwordRef}
        style={[
          styles.emailInput,
          { color: theme.text, borderColor: theme.border },
        ]}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={() => {
          if (!signingIn && email && password) handlePress();
        }}
        accessibilityLabel="Password"
      />
      <TouchableOpacity
        style={[
          styles.emailButton,
          { borderColor: theme.primary },
          signingIn && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={signingIn || !email || !password}
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'signIn' ? 'Masuk dengan email' : 'Daftar dengan email'
        }
      >
        <Text style={{ color: theme.primary, fontWeight: '700' }}>
          {mode === 'signIn' ? 'Masuk' : 'Daftar'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        disabled={signingIn}
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'signIn' ? 'Beralih ke daftar akun baru' : 'Beralih ke masuk'
        }
      >
        <Text style={[styles.switchModeText, { color: theme.textMuted }]}>
          {mode === 'signIn'
            ? 'Belum punya akun? Daftar'
            : 'Sudah punya akun? Masuk'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['4xl'],
  },
  content: {
    // flexGrow (not flex: 1) so it keeps its natural height inside the ScrollView on short
    // screens instead of collapsing to zero under the buttons.
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.md,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.display,
    fontSize: 32,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emailBlock: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xs'],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...typography.caption,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    fontSize: 15,
  },
  emailButton: {
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing['2xs'],
  },
  privacyLink: {
    ...typography.caption,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
});
