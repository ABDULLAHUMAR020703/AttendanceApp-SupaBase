/**
 * Attendance Settings Screen
 * Super Admin only - Configure global attendance settings
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  isAutoCheckoutEnabled,
  setAutoCheckoutEnabled,
  clearAllConfigCache,
} from '../features/attendance/services/attendanceConfigService';
import { fontSize, spacing, iconSize, responsivePadding, responsiveFont } from '../utils/responsive';

export default function AttendanceSettingsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [autoCheckoutEnabled, setAutoCheckoutEnabledState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    
    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadSettings();
    });

    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const enabled = await isAutoCheckoutEnabled(false); // Don't use cache on load
      setAutoCheckoutEnabledState(enabled);
    } catch (error) {
      console.error('[AttendanceSettings] Error loading settings:', error);
      Alert.alert('Error', 'Failed to load attendance settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoCheckout = async (value) => {
    if (user?.role !== 'super_admin') {
      Alert.alert('Error', 'Only super admin can change this setting');
      return;
    }

    try {
      setIsSaving(true);
      
      const result = await setAutoCheckoutEnabled(value);

      if (result.success) {
        setAutoCheckoutEnabledState(value);
        Alert.alert(
          'Success',
          `Auto check-out ${value ? 'enabled' : 'disabled'} successfully`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update setting');
        // Reload to get correct value
        await loadSettings();
      }
    } catch (error) {
      console.error('[AttendanceSettings] Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
      // Reload to get correct value
      await loadSettings();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: spacing.md }}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: responsivePadding(16) }}
      >
        {/* Auto Checkout Toggle */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: spacing.md,
            marginBottom: spacing.md,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: responsiveFont(18),
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: spacing.xs,
                }}
              >
                Auto Check-Out
              </Text>
              <Text
                style={{
                  fontSize: responsiveFont(14),
                  color: colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                When enabled, employees are automatically checked out when they leave the 1km office radius.
                When disabled, manual checkout is blocked if the employee is outside the radius.
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: responsiveFont(16),
                color: colors.text,
                fontWeight: '500',
              }}
            >
              Status: {autoCheckoutEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Switch
              value={autoCheckoutEnabled}
              onValueChange={handleToggleAutoCheckout}
              disabled={isSaving || user?.role !== 'super_admin'}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={autoCheckoutEnabled ? 'white' : colors.textSecondary}
            />
          </View>

          {user?.role !== 'super_admin' && (
            <Text
              style={{
                fontSize: responsiveFont(12),
                color: colors.textSecondary,
                marginTop: spacing.xs,
                fontStyle: 'italic',
              }}
            >
              Only super admin can change this setting
            </Text>
          )}
        </View>

        {/* Info Card */}
        <View
          style={{
            backgroundColor: colors.primaryLight,
            borderRadius: 12,
            padding: spacing.md,
            marginTop: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons
              name="information-circle"
              size={iconSize.md}
              color={colors.primary}
              style={{ marginRight: spacing.sm, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: responsiveFont(14),
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: spacing.xs,
                }}
              >
                How It Works
              </Text>
              <Text
                style={{
                  fontSize: responsiveFont(13),
                  color: colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                • Location is monitored every 60 seconds while employees are checked in{'\n'}
                • Only applies to employees with "in_office" work mode{'\n'}
                • Office location and 1km radius are configured in GeoFencing settings{'\n'}
                • Managers receive notifications when their department employees are auto checked out
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
