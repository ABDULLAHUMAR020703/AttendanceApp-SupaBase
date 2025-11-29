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
import { Ionicons } from '@expo/vector-icons';
import { authenticateUser } from '../utils/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen() {
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
      const result = await authenticateUser(username.trim(), password);
      
      if (result.success) {
        // Fetch full employee data including department
        const { getEmployeeByUsername } = await import('../utils/employees');
        const employee = await getEmployeeByUsername(result.user.username);
        
        if (employee) {
          loginUser({
            username: employee.username,
            role: employee.role,
            department: employee.department,
            name: employee.name,
            email: employee.email,
            id: employee.id
          });
        } else {
          // Fallback to basic user data if employee not found
          loginUser({
            username: result.user.username,
            role: result.user.role
          });
        }
      } else {
        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-8">
          {/* Header */}
          <View className="items-center mb-12">
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.primary }}
            >
              <Ionicons name="time-outline" size={40} color="white" />
            </View>
            <Text 
              className="text-3xl font-bold mb-2"
              style={{ color: colors.text }}
            >
              Attendance App
            </Text>
            <Text 
              className="text-center"
              style={{ color: colors.textSecondary }}
            >
              Sign in to track your attendance
            </Text>
          </View>

          {/* Login Form */}
          <View 
            className="rounded-2xl p-6 shadow-lg"
            style={{ backgroundColor: colors.surface }}
          >
            <Text 
              className="text-xl font-semibold mb-6 text-center"
              style={{ color: colors.text }}
            >
              Sign In
            </Text>

            {/* Username Input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Username</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                <Ionicons name="person-outline" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-800"
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <TextInput
                  className="flex-1 ml-3 text-gray-800"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2"
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              className={`bg-primary-500 rounded-xl py-4 items-center mb-4 ${
                isLoading ? 'opacity-50' : ''
              }`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text className="text-white font-semibold">Signing In...</Text>
              ) : (
                <Text className="text-white font-semibold text-lg">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Test Users Info */}
          <View className="mt-8 bg-blue-50 rounded-xl p-4">
            <Text className="text-blue-800 font-semibold mb-2 text-center">
              Test Credentials
            </Text>
            <View className="space-y-1">
              <Text className="text-blue-700 text-sm">
                Employee: testuser / testuser123
              </Text>
              <Text className="text-blue-700 text-sm">
                Admin: testadmin / testadmin123
              </Text>
              <Text className="text-blue-600 text-xs mt-2 text-center">
                See TEST_CREDENTIALS.md for more test accounts
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

