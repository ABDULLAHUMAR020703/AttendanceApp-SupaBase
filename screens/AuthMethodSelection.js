// Screen for employees to select their preferred authentication method
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkBiometricAvailability, getBiometricTypeName } from '../utils/biometricAuth';
import { checkFaceRecognitionAvailability, verifyFace } from '../utils/faceVerification';
import { setAuthPreference, getAuthPreference } from '../utils/authPreferences';

export default function AuthMethodSelection({ navigation, route }) {
  const { user } = route.params;
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [faceIDAvailable, setFaceIDAvailable] = useState(false);
  const [faceIDEnrolled, setFaceIDEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingFaceID, setTestingFaceID] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // Check current preference
      const currentPreference = await getAuthPreference(user.username);
      
      // Check biometric availability with error handling
      try {
        const availability = await checkBiometricAvailability();
        setBiometricAvailable(availability.available);
        
        if (availability.available) {
          setBiometricType(getBiometricTypeName(availability.types));
        }
      } catch (biometricError) {
        console.warn('Biometric check failed (may not work in Expo Go):', biometricError);
        setBiometricAvailable(false);
      }

      // Check Face ID availability and enrollment
      try {
        const faceAvailability = await checkFaceRecognitionAvailability();
        setFaceIDAvailable(faceAvailability.available);
        setFaceIDEnrolled(faceAvailability.available); // If available, it means enrolled
      } catch (faceError) {
        console.warn('Face ID check failed:', faceError);
        setFaceIDAvailable(false);
        setFaceIDEnrolled(false);
      }
      
      // Set initial selection
      if (currentPreference) {
        setSelectedMethod(currentPreference);
      } else {
        // Default to face verification (safer for Expo Go)
        setSelectedMethod('face');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Don't show alert - just default to face
      setSelectedMethod('face');
      setBiometricAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select an authentication method');
      return;
    }

    setSaving(true);
    try {
      const success = await setAuthPreference(user.username, selectedMethod);
      
      if (success) {
        Alert.alert(
          'Success',
          `Your authentication method has been set to ${selectedMethod === 'biometric' ? 'Fingerprint Authentication' : 'Face Verification'}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save preference');
      }
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            Choose Authentication Method
          </Text>
          <Text className="text-gray-600">
            Select how you want to verify your identity when checking in/out
          </Text>
        </View>

        {/* Face Verification Option */}
        <TouchableOpacity
          className={`bg-white rounded-2xl p-6 mb-4 shadow-sm border-2 ${
            selectedMethod === 'face' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
          } ${!faceIDAvailable ? 'opacity-50' : ''}`}
          onPress={async () => {
            if (!faceIDAvailable) {
              Alert.alert(
                'Face ID Not Set Up',
                'Face ID is not set up on this device.\n\nPlease set up Face ID in your device settings:\n\n• iOS: Settings > Face ID & Passcode\n• Android: Settings > Security > Face unlock\n\nAfter setting up Face ID, return to this app and try again.',
                [{ text: 'OK' }]
              );
              return;
            }
            setSelectedMethod('face');
          }}
          disabled={!faceIDAvailable}
        >
          <View className="flex-row items-center">
            <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
              selectedMethod === 'face' ? 'bg-primary-500' : 'bg-gray-200'
            }`}>
              <Ionicons 
                name="finger-print" 
                size={32} 
                color={selectedMethod === 'face' ? 'white' : '#9ca3af'} 
              />
            </View>
            <View className="flex-1">
              <Text className={`text-lg font-semibold mb-1 ${
                selectedMethod === 'face' ? 'text-primary-700' : 'text-gray-800'
              }`}>
                Face Verification
              </Text>
              <Text className="text-sm text-gray-600 mb-2">
                Use device's native Face ID for authentication
              </Text>
              <Text className="text-xs text-gray-500">
                • Uses device's built-in Face ID/Face Unlock{'\n'}
                • Secure and fast authentication{'\n'}
                • No photo required - uses device's Face ID directly
              </Text>
              {!faceIDAvailable && (
                <View className="mt-2 bg-yellow-100 px-2 py-1 rounded-full self-start">
                  <Text className="text-xs font-medium text-yellow-800">Not Set Up</Text>
                </View>
              )}
            </View>
            {selectedMethod === 'face' && (
              <Ionicons name="checkmark-circle" size={28} color="#3b82f6" />
            )}
          </View>
        </TouchableOpacity>

        {/* Test Face ID Button - Only show if Face ID is selected and available */}
        {selectedMethod === 'face' && faceIDAvailable && (
          <TouchableOpacity
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
            onPress={async () => {
              setTestingFaceID(true);
              try {
                const result = await verifyFace(
                  user.username,
                  'Test Face ID authentication'
                );
                if (result.success) {
                  Alert.alert(
                    'Face ID Test Successful',
                    'Face ID is working correctly! You can use this method for authentication.',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Face ID Test Failed',
                    result.error || 'Face ID authentication failed. Please ensure:\n\n• Face ID is properly set up\n• Your face is clearly visible\n• Try again in a well-lit area',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to test Face ID. Please try again.',
                  [{ text: 'OK' }]
                );
              } finally {
                setTestingFaceID(false);
              }
            }}
            disabled={testingFaceID}
          >
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle-outline" size={20} color="#3b82f6" className="mr-2" />
              <Text className="text-sm font-medium text-blue-800 flex-1">
                {testingFaceID ? 'Testing Face ID...' : 'Test Face ID'}
              </Text>
              {testingFaceID && (
                <ActivityIndicator size="small" color="#3b82f6" />
              )}
            </View>
            <Text className="text-xs text-blue-600 mt-1">
              Tap to verify that Face ID is working on your device
            </Text>
          </TouchableOpacity>
        )}

        {/* Fingerprint/Biometric Option */}
        <TouchableOpacity
          className={`bg-white rounded-2xl p-6 mb-4 shadow-sm border-2 ${
            selectedMethod === 'biometric' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
          } ${!biometricAvailable ? 'opacity-50' : ''}`}
          onPress={() => {
            if (biometricAvailable) {
              setSelectedMethod('biometric');
            } else {
              Alert.alert(
                'Not Available',
                'Biometric authentication is not available on this device. Please set up fingerprint or Face ID in your device settings, or use Face Verification instead.',
                [{ text: 'OK' }]
              );
            }
          }}
          disabled={!biometricAvailable}
        >
          <View className="flex-row items-center">
            <View className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
              selectedMethod === 'biometric' ? 'bg-primary-500' : 
              biometricAvailable ? 'bg-gray-200' : 'bg-gray-100'
            }`}>
              <Ionicons 
                name="finger-print" 
                size={32} 
                color={
                  selectedMethod === 'biometric' ? 'white' : 
                  biometricAvailable ? '#9ca3af' : '#d1d5db'
                } 
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className={`text-lg font-semibold ${
                  selectedMethod === 'biometric' ? 'text-primary-700' : 'text-gray-800'
                }`}>
                  Fingerprint Authentication
                </Text>
                {!biometricAvailable && (
                  <View className="ml-2 bg-yellow-100 px-2 py-1 rounded-full">
                    <Text className="text-xs font-medium text-yellow-800">Not Available</Text>
                  </View>
                )}
              </View>
              <Text className="text-sm text-gray-600 mb-2">
                Use your fingerprint sensor for quick verification
              </Text>
              <Text className="text-xs text-gray-500">
                • Uses device's built-in fingerprint sensor{'\n'}
                • Fast and secure authentication{'\n'}
                • Works with fingerprint enrolled on your device
              </Text>
            </View>
            {selectedMethod === 'biometric' && (
              <Ionicons name="checkmark-circle" size={28} color="#3b82f6" />
            )}
          </View>
        </TouchableOpacity>

        {/* Information Box */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3b82f6" className="mr-2" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-blue-800 mb-1">
                How It Works:
              </Text>
              <Text className="text-xs text-blue-700 leading-5">
                <Text className="font-semibold">Face ID:</Text> Uses your device's native Face ID/Face Unlock to authenticate. No photos are taken - authentication happens directly through your device's security system.{'\n\n'}
                <Text className="font-semibold">Fingerprint Authentication:</Text> Your device's fingerprint sensor verifies your identity. Your fingerprint data is stored securely on your device and never shared with the app.{'\n\n'}
                You can change this setting anytime.
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${
            saving ? 'bg-gray-400' : 'bg-primary-500'
          }`}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              Save Preference
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

