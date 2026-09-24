import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { Theme } from '../constants/theme';
import { cardShadow } from '../constants/elevation';
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

function TabIcon({ routeName, theme }: { routeName: keyof TabParamList; theme: Theme }) {
  if (routeName === 'Add') {
    return (
      <View style={[styles.addButton, cardShadow, { backgroundColor: theme.primary }]}>
        <Icon name="plus" size={28} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    );
  }
  return <Icon name={ICONS[routeName]} size={24} color={theme.textMuted} />;
}

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: [styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border }],
        tabBarIcon: () => <TabIcon routeName={route.name} theme={theme} />,
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
    height: 64,
    paddingTop: 8,
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
