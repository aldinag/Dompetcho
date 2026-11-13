/**
 * Dompetcho
 * @format
 */

import React from 'react';
import {
  Keyboard,
  StatusBar,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ImportOverlay } from './src/components/ImportOverlay';
import { RootNavigator } from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {/* Tap anywhere that isn't a button/input/scroll gesture to dismiss the keyboard, on every
            screen. Touchables and TextInputs claim their own taps first, so this only sees the
            "empty" ones. `accessible={false}` keeps screen readers from announcing it. */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.fill}>
            <RootNavigator />
            <ImportOverlay />
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default App;
