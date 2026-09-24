import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'dompetcho:onboardingSeen';

interface OnboardingState {
  loading: boolean;
  seen: boolean;
  load: () => Promise<void>;
  markSeen: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>(set => ({
  loading: true,
  seen: false,

  load: async () => {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    set({ seen: value === 'true', loading: false });
  },

  markSeen: async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    set({ seen: true });
  },
}));
