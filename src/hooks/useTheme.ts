import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../constants/theme';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
