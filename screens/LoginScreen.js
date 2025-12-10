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
import { authenticateUser } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont, wp } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { handleLogin: loginUser } = useAuth();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login for:', username.trim());
      const result = await authenticateUser(username.trim(), password);
      console.log('Authentication result:', result);
      
      if (result.success) {
        // Ensure employees are initialized first
        const { initializeDefaultEmployees, getEmployeeByUsername } = await import('../utils/employees');
        await initializeDefaultEmployees();
        
        // Fetch full employee data including department
        const employee = await getEmployeeByUsername(result.user.username);
        console.log('Employee lookup result:', employee);
        
        if (employee) {
          // Use employee data but prioritize auth role (more reliable)
          const userData = {
            username: employee.username,
            role: result.user.role, // Use role from authentication, not employee data
            department: employee.department,
            name: employee.name,
            email: employee.email,
            id: employee.id
          };
          console.log('Logging in with employee data (using auth role):', userData);
          loginUser(userData);
        } else {
          // Fallback to basic user data if employee not found
          const userData = {
            username: result.user.username,
            role: result.user.role
          };
          console.log('Logging in with auth data (employee not found):', userData);
          loginUser(userData);
        }
      } else {
        console.log('Authentication failed');
        Alert.alert('Login Failed', result.error || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', `An error occurred during login: ${error.message || 'Unknown error'}`);
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
          style={{ paddingHorizontal: responsivePadding(32) }}
        >
          {/* Header */}
          <View 
            className="items-center"
            style={{ marginBottom: spacing['3xl'] }}
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
              Present
            </Text>
            <Text 
              className="text-center"
              style={{ 
                color: colors.textSecondary,
                fontSize: responsiveFont(14),
              }}
            >
              Sign in to track your attendance
            </Text>
          </View>

          {/* Login Form */}
          <View 
            className="rounded-2xl shadow-lg"
            style={{ 
              backgroundColor: colors.surface,
              padding: responsivePadding(24),
            }}
          >
            <Text 
              className="font-semibold text-center"
              style={{ 
                color: colors.text,
                fontSize: responsiveFont(20),
                marginBottom: spacing.lg,
              }}
            >
              Sign In
            </Text>

            {/* Username Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text 
                className="text-gray-700 font-medium"
                style={{ 
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Username
              </Text>
              <View 
                className="flex-row items-center bg-gray-100 rounded-xl"
                style={{
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="person-outline" size={iconSize.md} color="#6b7280" />
                <TextInput
                  className="flex-1 text-gray-800"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text 
                className="text-gray-700 font-medium"
                style={{ 
                  fontSize: responsiveFont(14),
                  marginBottom: spacing.xs,
                }}
              >
                Password
              </Text>
              <View 
                className="flex-row items-center bg-gray-100 rounded-xl"
                style={{
                  paddingHorizontal: responsivePadding(16),
                  paddingVertical: spacing.md,
                }}
              >
                <Ionicons name="lock-closed-outline" size={iconSize.md} color="#6b7280" />
                <TextInput
                  className="flex-1 text-gray-800"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                  style={{
                    fontSize: responsiveFont(14),
                    marginLeft: spacing.md,
                  }}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ marginLeft: spacing.xs }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={iconSize.md} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
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
              onPress={handleLogin}
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
                  Signing In...
                </Text>
              ) : (
                <Text 
                  style={{ 
                    color: 'white', 
                    fontWeight: '600', 
                    fontSize: responsiveFont(18),
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Test Users Info */}
          <View 
            className="bg-blue-50 rounded-xl"
            style={{
              marginTop: spacing['2xl'],
              padding: responsivePadding(16),
            }}
          >
            <Text 
              className="text-blue-800 font-semibold text-center"
              style={{ 
                fontSize: responsiveFont(14),
                marginBottom: spacing.xs,
              }}
            >
              Test Credentials
            </Text>
            <View style={{ gap: spacing.xs / 2 }}>
              <Text 
                className="text-blue-700"
                style={{ fontSize: responsiveFont(12) }}
              >
                Employee: testuser / testuser123
              </Text>
              <Text 
                className="text-blue-700"
                style={{ fontSize: responsiveFont(12) }}
              >
                Admin: testadmin / testadmin123
              </Text>
              <Text 
                className="text-blue-600 text-center"
                style={{ 
                  fontSize: responsiveFont(10),
                  marginTop: spacing.xs,
                }}
              >
                See TEST_CREDENTIALS.md for more test accounts
              </Text>
            </View>
          </View>

          {/* Sign Up Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={{ alignItems: 'center', marginTop: spacing.lg }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: responsiveFont(14),
              }}
            >
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>

          {/* Trademark */}
          <Trademark position="bottom" style={{ marginTop: spacing['2xl'] }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

