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
import { saveUserSession } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { handleLogin: loginUser } = useAuth();
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
        await saveUserSession(result.user);
        loginUser(result.user);
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
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-8">
          {/* Header */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-primary-500 rounded-full items-center justify-center mb-4">
              <Ionicons name="time-outline" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              Attendance App
            </Text>
            <Text className="text-gray-600 text-center">
              Sign in to track your attendance
            </Text>
          </View>

          {/* Login Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-xl font-semibold text-gray-800 mb-6 text-center">
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
              className={`bg-primary-500 rounded-xl py-4 items-center ${
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

          {/* Demo Credentials */}
          <View className="mt-8 bg-blue-50 rounded-xl p-4">
            <Text className="text-blue-800 font-semibold mb-2 text-center">
              Demo Credentials
            </Text>
            <View className="space-y-1">
              <Text className="text-blue-700 text-sm">
                Employee: testuser / testuser123
              </Text>
              <Text className="text-blue-700 text-sm">
                Admin: testadmin / testadmin123
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
