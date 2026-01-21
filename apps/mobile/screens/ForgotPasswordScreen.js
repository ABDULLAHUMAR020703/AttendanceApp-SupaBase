/**
 * Forgot Password Screen
 * Allows users to request a password reset email via Supabase Auth
 * 
 * SECURITY:
 * - Always shows generic success message (prevents email enumeration)
 * - No password data stored
 * - Uses Supabase Auth only
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../core/config/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async () => {
    // Validate email format
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Get redirect URL from app config or use default
      const redirectUrl = 'hadirai://reset-password';

      // Call Supabase resetPasswordForEmail
      // Note: Supabase will send email even if email doesn't exist (security best practice)
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error.message);
        
        // Handle specific error cases
        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
          Alert.alert(
            'Rate Limit Exceeded',
            'Too many password reset requests. Please wait a few minutes before trying again.'
          );
          return;
        }

        if (error.message?.includes('Email not found')) {
          // Still show generic success (security best practice - don't reveal if email exists)
          // But log the error for debugging
          console.warn('Email not found, but showing generic success message');
        } else {
          // For other errors, show generic message
          Alert.alert(
            'Error',
            'Unable to send reset email. Please check your email address and try again.'
          );
          setIsLoading(false);
          return;
        }
      }

      // Always show generic success message (prevents email enumeration)
      setEmailSent(true);
      Alert.alert(
        'Reset Link Sent',
        'If an account exists with this email, you will receive a password reset link shortly. Please check your email and follow the instructions.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Optionally navigate back to login
              // navigation.goBack();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error sending reset email:', error);
      
      // Handle network errors
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        Alert.alert(
          'Network Error',
          'Unable to connect. Please check your internet connection and try again.'
        );
      } else {
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again later.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: responsivePadding(32),
          }}
        >
          {/* Header */}
          <View
            style={{
              alignItems: 'center',
              marginBottom: spacing['3xl'],
            }}
          >
            <Logo size="medium" style={{ marginBottom: spacing.lg }} />
            <Text
              style={{
                color: colors.text,
                fontSize: responsiveFont(30),
                fontWeight: 'bold',
                marginBottom: spacing.xs,
              }}
            >
              Reset Password
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: responsiveFont(14),
                textAlign: 'center',
              }}
            >
              Enter your email to receive a password reset link
            </Text>
          </View>

          {/* Form */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: responsivePadding(24),
            }}
          >
            {emailSent ? (
              <View style={{ alignItems: 'center' }}>
                <Ionicons
                  name="mail-outline"
                  size={64}
                  color={colors.primary}
                  style={{ marginBottom: spacing.lg }}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(18),
                    fontWeight: '600',
                    marginBottom: spacing.md,
                    textAlign: 'center',
                  }}
                >
                  Check Your Email
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: responsiveFont(14),
                    textAlign: 'center',
                    marginBottom: spacing.lg,
                  }}
                >
                  If an account exists with this email, you will receive a password reset link shortly.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    marginTop: spacing.md,
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontWeight: '600',
                      fontSize: responsiveFont(16),
                    }}
                  >
                    Send Another Email
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Email Input */}
                <View style={{ marginBottom: spacing.lg }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: responsiveFont(14),
                      fontWeight: '600',
                      marginBottom: spacing.xs,
                    }}
                  >
                    Email Address
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.borderLight,
                      borderRadius: 12,
                      paddingHorizontal: responsivePadding(16),
                      paddingVertical: spacing.md,
                    }}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={iconSize.md}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: responsiveFont(14),
                        marginLeft: spacing.md,
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Send Reset Link Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: componentSize.buttonHeight / 2,
                    alignItems: 'center',
                    marginBottom: spacing.md,
                    opacity: isLoading ? 0.5 : 1,
                    minHeight: componentSize.buttonHeight,
                    justifyContent: 'center',
                  }}
                  onPress={handleSendResetLink}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      style={{
                        color: 'white',
                        fontWeight: '600',
                        fontSize: responsiveFont(18),
                      }}
                    >
                      Send Reset Link
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                alignItems: 'center',
                marginTop: spacing.md,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: responsiveFont(14),
                }}
              >
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Trademark */}
          <Trademark position="bottom" style={{ marginTop: spacing['2xl'] }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
