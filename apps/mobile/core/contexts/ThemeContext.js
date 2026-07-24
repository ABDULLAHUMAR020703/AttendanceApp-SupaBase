import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = '@app_theme';

/** Stable palettes — never recreated per render. */
const LIGHT_COLORS = Object.freeze({
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  primary: '#3b82f6',
  primaryLight: '#dbeafe',
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#ef4444',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  shadow: 'rgba(0, 0, 0, 0.1)',
});

const DARK_COLORS = Object.freeze({
  background: '#111827',
  surface: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textTertiary: '#9ca3af',
  primary: '#60a5fa',
  primaryLight: '#1e3a8a',
  success: '#34d399',
  successLight: '#065f46',
  error: '#f87171',
  errorLight: '#7f1d1d',
  warning: '#fbbf24',
  warningLight: '#78350f',
  border: '#374151',
  borderLight: '#4b5563',
  shadow: 'rgba(0, 0, 0, 0.5)',
});

const THEME_PALETTES = Object.freeze({
  light: LIGHT_COLORS,
  dark: DARK_COLORS,
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('system'); // 'light', 'dark', or 'system'
  const [isLoading, setIsLoading] = useState(true);
  const [actualTheme, setActualTheme] = useState('light');

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
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
        setTheme('system');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      setTheme('system');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = useCallback(async (newTheme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(actualTheme === 'light' ? 'dark' : 'light');
  }, [actualTheme, setThemeMode]);

  const themeColors = actualTheme === 'dark' ? THEME_PALETTES.dark : THEME_PALETTES.light;

  const value = useMemo(
    () => ({
      theme: actualTheme,
      themePreference: theme,
      colors: themeColors,
      setTheme: setThemeMode,
      toggleTheme,
      isLoading,
    }),
    [actualTheme, theme, themeColors, setThemeMode, toggleTheme, isLoading]
  );

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
