/**
 * Web stub — react-native-maps is native-only and breaks the web bundle.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/contexts/ThemeContext';

export default function GeoFencingScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors?.background || '#fff' }]}>
      <Text style={[styles.title, { color: colors?.text || '#111' }]}>
        Geofencing map
      </Text>
      <Text style={[styles.body, { color: colors?.textSecondary || '#666' }]}>
        Maps are not available in the web browser. Open this app in Expo Go on
        your phone (or an Android/iOS emulator) to manage office locations.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
