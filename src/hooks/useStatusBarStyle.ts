import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from './useTheme';

/**
 * Sets the status bar icon color on focus. Most screens sit on the plain `background` and
 * want 'default'; Home/Profile have a colored `primary` header at the very top and need
 * 'onPrimary', which is the opposite style. Screens share one global StatusBar instance, so
 * every screen must claim its own style on focus or a previous screen's setting leaks in.
 */
export function useStatusBarStyle(variant: 'default' | 'onPrimary') {
  const theme = useTheme();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(variant === 'onPrimary' ? theme.statusBarOnPrimary : theme.statusBarDefault, true);
    }, [variant, theme]),
  );
}
