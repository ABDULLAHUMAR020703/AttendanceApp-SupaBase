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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createSignupRequest } from '../utils/signupRequests';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont, wp } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      Alert.alert('Validation Error', 'Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      Alert.alert('Validation Error', 'Username must be at least 3 characters');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await createSignupRequest({
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: 'employee', // Default role, can be changed by admin
      });

      if (result.success) {
        Alert.alert(
          'Sign Up Request Submitted',
          'Your signup request has been submitted. A super admin will review and approve your account. You will be notified once approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Failed to submit signup request');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', `An error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="flex-1 justify-center"
          style={{ paddingHorizontal: responsivePadding(32), paddingVertical: spacing['2xl'] }}
        >
          {/* Header */}
          <View
            className="items-center"
            style={{ marginBottom: spacing['2xl'] }}
          >
            <Logo size="large" style={{ marginBottom: spacing.md }} />
            <Text
              className="font-bold"
              style={{
                color: colors.text,
                fontSize: responsiveFont(30),
                marginBottom: spacing.xs,
              }}
            >
              Sign Up
            </Text>
            <Text
              className="text-center"
              style={{
                color: colors.textSecondary,
                fontSize: responsiveFont(14),
              }}
            >
              Create an account (requires admin approval)
            </Text>
          </View>

          {/* Sign Up Form */}
          <View
            className="rounded-2xl shadow-lg"
            style={{
              backgroundColor: colors.surface,
              padding: responsivePadding(24),
            }}
          >
            {/* Username Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                className="font-medium"
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Username
              </Text>
              <View
                className="flex-row items-center rounded-xl"
                style={{
                  backgroundColor: colors.borderLight,
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="person-outline" size={iconSize.md} color={colors.textSecondary} />
                <TextInput
                  className="flex-1"
                  placeholder="Enter username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Name Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                className="font-medium"
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Full Name
              </Text>
              <View
                className="flex-row items-center rounded-xl"
                style={{
                  backgroundColor: colors.borderLight,
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="person-circle-outline" size={iconSize.md} color={colors.textSecondary} />
                <TextInput
                  className="flex-1"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                className="font-medium"
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Email
              </Text>
              <View
                className="flex-row items-center rounded-xl"
                style={{
                  backgroundColor: colors.borderLight,
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="mail-outline" size={iconSize.md} color={colors.textSecondary} />
                <TextInput
                  className="flex-1"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                className="font-medium"
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Password
              </Text>
              <View
                className="flex-row items-center rounded-xl"
                style={{
                  backgroundColor: colors.borderLight,
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="lock-closed-outline" size={iconSize.md} color={colors.textSecondary} />
                <TextInput
                  className="flex-1"
                  placeholder="Enter password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ marginLeft: spacing.xs }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={iconSize.md}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                className="font-medium"
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Confirm Password
              </Text>
              <View
                className="flex-row items-center rounded-xl"
                style={{
                  backgroundColor: colors.borderLight,
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="lock-closed-outline" size={iconSize.md} color={colors.textSecondary} />
                <TextInput
                  className="flex-1"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    color: colors.text,
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ marginLeft: spacing.xs }}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={iconSize.md}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: componentSize.buttonHeight / 2,
                alignItems: 'center',
                marginBottom: spacing.base,
                opacity: isLoading ? 0.5 : 1,
                minHeight: componentSize.buttonHeight,
                justifyContent: 'center',
              }}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: responsiveFont(16),
                  }}
                >
                  Submitting...
                </Text>
              ) : (
                <Text
                  style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: responsiveFont(18),
                  }}
                >
                  Submit Sign Up Request
                </Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ alignItems: 'center', marginTop: spacing.sm }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: responsiveFont(14),
                }}
              >
                Already have an account? Sign In
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

