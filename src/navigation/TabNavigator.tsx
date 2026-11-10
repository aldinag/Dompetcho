import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { Theme } from '../constants/theme';
import { tintedShadow } from '../constants/elevation';
import { useTheme } from '../hooks/useTheme';
import { ExpenseFormScreen } from '../screens/ExpenseFormScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Add: 'plus',
  Summary: 'chart',
};

const LABELS: Record<keyof TabParamList, string> = {
  Home: 'Beranda',
  Add: 'Tambah',
  Summary: 'Ringkasan',
};

function TabIcon({ routeName, theme, focused }: { routeName: keyof TabParamList; theme: Theme; focused: boolean }) {
  if (routeName === 'Add') {
    // primaryText, not white: `primary` is a light tint in dark mode, where white is unreadable.
    return (
      <View style={[styles.addButton, tintedShadow(theme.primary), { backgroundColor: theme.primary }]}>
        <Icon name="plus" size={28} color={theme.primaryText} strokeWidth={2.5} />
      </View>
    );
  }
  return <Icon name={ICONS[routeName]} size={24} color={focused ? theme.primary : theme.textMuted} />;
}

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabel: route.name === 'Add' ? '' : LABELS[route.name],
        tabBarLabelStyle: styles.label,
        tabBarStyle: [styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border }],
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} theme={theme} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add" component={ExpenseFormScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 8,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
});
