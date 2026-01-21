// Reusable Help & Support Button Component
// Navigates to Help & Support screen or opens email app with mailto: link
import React from 'react';
import { TouchableOpacity, Text, View, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../core/contexts/ThemeContext';
import { fontSize, spacing, iconSize, responsiveFont, responsivePadding } from '../../utils/responsive';
import { ROUTES } from '../constants/routes';

const SUPPORT_EMAIL = 'sales@techdotglobal.com';

/**
 * Help & Support Button Component
 * Navigates to Help & Support screen (preferred) or opens email app as fallback
 * 
 * @param {Object} props
 * @param {string} props.variant - 'button' | 'menu' (default: 'button')
 * @param {Object} props.style - Custom styles
 * @param {Function} props.onPress - Optional callback after action
 * @param {Object} props.navigation - Navigation object (if available, navigates to screen)
 */
export default function HelpButton({ variant = 'button', style, onPress, navigation }) {
  const { colors } = useTheme();

  const handleHelpPress = async () => {
    // If navigation is available, navigate to Help & Support screen
    if (navigation) {
      try {
        // HelpSupportScreen is nested inside MainNavigator, which is registered as "MainStack" in DrawerNavigator
        // Use nested navigation syntax to navigate to the nested screen
        // This works whether called from DrawerNavigator or MainNavigator context
        navigation.navigate('MainStack', { screen: ROUTES.HELP_SUPPORT });
        if (onPress) {
          onPress();
        }
        return;
      } catch (navError) {
        console.warn('Navigation failed, falling back to email:', navError);
        // Fall through to email fallback
      }
    }

    // Fallback: Open email app directly
    try {
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=Support Request - hadir.ai`;
      
      // Check if mailto: links are supported
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        if (onPress) {
          onPress();
        }
      } else {
        // Fallback: Show email address if mailto: is not supported
        Alert.alert(
          'Help & Support',
          `Please contact us at:\n\n${SUPPORT_EMAIL}`,
          [
            { text: 'Copy Email', onPress: () => {
              // Note: Clipboard API would require expo-clipboard
              // For now, just show the email
            }},
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert(
        'Error',
        'Unable to open email app. Please contact us at:\n\n' + SUPPORT_EMAIL,
        [{ text: 'OK' }]
      );
    }
  };

  if (variant === 'menu') {
    // Menu item style (for drawer)
    return (
      <TouchableOpacity
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
            borderRadius: 12,
            marginBottom: spacing.xs,
          },
          style,
        ]}
        onPress={handleHelpPress}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons
            name="help-circle-outline"
            size={iconSize.lg}
            color={colors.textSecondary}
          />
          <Text
            style={{
              marginLeft: spacing.md,
              fontWeight: '500',
              color: colors.text,
              fontSize: responsiveFont(16),
            }}
          >
            Help & Support
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Button style (for inline use)
  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: 12,
          marginVertical: spacing.sm,
        },
        style,
      ]}
      onPress={handleHelpPress}
      activeOpacity={0.8}
    >
      <Ionicons name="help-circle" size={iconSize.md} color="white" />
      <Text
        style={{
          color: 'white',
          fontWeight: '600',
          marginLeft: spacing.sm,
          fontSize: responsiveFont(16),
        }}
      >
        Help & Support
      </Text>
    </TouchableOpacity>
  );
}

