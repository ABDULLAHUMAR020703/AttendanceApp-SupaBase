// Main App Navigator - Routes users to appropriate navigation stack
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { colors, theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // CRITICAL FIX: Use user.uid as key to force navigation reset when user changes
  // This prevents manager screens from rendering with wrong user data
  const navigationKey = user ? `${user.uid}-${user.role}` : 'no-user';

  return (
    <NavigationContainer key={navigationKey}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {!user ? <AuthNavigator /> : <DrawerNavigator user={user} />}
    </NavigationContainer>
  );
}

