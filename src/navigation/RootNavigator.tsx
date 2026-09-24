import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useShareIntent } from '../hooks/useShareIntent';
import { useTheme } from '../hooks/useTheme';
import { ExpenseFormScreen } from '../screens/ExpenseFormScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { navigationRef } from './navigationRef';
import { TabNavigator } from './TabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const initializing = useAuthStore(state => state.initializing);
  const user = useAuthStore(state => state.user);
  const init = useAuthStore(state => state.init);
  const loadInitial = useExpenseStore(state => state.loadInitial);
  const onboardingLoading = useOnboardingStore(state => state.loading);
  const onboardingSeen = useOnboardingStore(state => state.seen);
  const loadOnboarding = useOnboardingStore(state => state.load);

  // Hooks must run unconditionally; they no-op internally until a user is signed in.
  useShareIntent();

  useEffect(() => {
    init();
    loadOnboarding();
  }, [init, loadOnboarding]);

  useEffect(() => {
    if (user) loadInitial();
  }, [user, loadInitial]);

  if (initializing || onboardingLoading) {
    return (
      <View style={[styles.splash, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingSeen ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : user ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="ExpenseForm"
              component={ExpenseFormScreen}
              options={({ route }) => ({
                headerShown: true,
                presentation: 'modal',
                title: route.params?.receiptScanId ? 'Tinjau Struk' : 'Tambah Pengeluaran',
              })}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = {
  splash: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
