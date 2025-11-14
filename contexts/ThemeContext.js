import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = '@app_theme';

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('system'); // 'light', 'dark', or 'system'
  const [isLoading, setIsLoading] = useState(true);
  const [actualTheme, setActualTheme] = useState('light'); // The actual theme being used

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    // Update actual theme based on theme preference and system setting
    if (theme === 'system') {
      setActualTheme(systemColorScheme || 'light');
    } else {
      setActualTheme(theme);
    }
  }, [theme, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Default to system theme
        setTheme('system');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setTheme('system');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (newTheme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    if (actualTheme === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('light');
    }
  };

  const colors = {
    light: {
      background: '#f9fafb', // gray-50
      surface: '#ffffff',
      text: '#111827', // gray-900
      textSecondary: '#6b7280', // gray-500
      textTertiary: '#9ca3af', // gray-400
      primary: '#3b82f6', // blue-500
      primaryLight: '#dbeafe', // blue-100
      success: '#10b981', // green-500
      successLight: '#d1fae5', // green-100
      error: '#ef4444', // red-500
      errorLight: '#fee2e2', // red-100
      warning: '#f59e0b', // amber-500
      warningLight: '#fef3c7', // amber-100
      border: '#e5e7eb', // gray-200
      borderLight: '#f3f4f6', // gray-100
      shadow: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      background: '#111827', // gray-900
      surface: '#1f2937', // gray-800
      text: '#f9fafb', // gray-50
      textSecondary: '#d1d5db', // gray-300
      textTertiary: '#9ca3af', // gray-400
      primary: '#60a5fa', // blue-400
      primaryLight: '#1e3a8a', // blue-900
      success: '#34d399', // green-400
      successLight: '#065f46', // green-900
      error: '#f87171', // red-400
      errorLight: '#7f1d1d', // red-900
      warning: '#fbbf24', // amber-400
      warningLight: '#78350f', // amber-900
      border: '#374151', // gray-700
      borderLight: '#4b5563', // gray-600
      shadow: 'rgba(0, 0, 0, 0.5)',
    },
  };

  const themeColors = colors[actualTheme];

  const value = {
    theme: actualTheme,
    themePreference: theme,
    colors: themeColors,
    setTheme: setThemeMode,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

