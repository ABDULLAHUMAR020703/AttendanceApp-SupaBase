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
import { useTheme } from '../contexts/ThemeContext';

export default function AuthMethodSelection({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="p-6">
        {/* Header */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mb-4"
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
            Choose Authentication Method
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Select how you want to verify your identity when checking in/out
          </Text>
        </View>

        {/* Face Verification Option */}
        <TouchableOpacity
          className="rounded-2xl p-6 mb-4 shadow-sm border-2"
          style={{
            backgroundColor: selectedMethod === 'face' ? colors.primaryLight : colors.surface,
            borderColor: selectedMethod === 'face' ? colors.primary : colors.border,
            opacity: !faceIDAvailable ? 0.5 : 1,
          }}
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
            <View 
              className="w-16 h-16 rounded-full items-center justify-center mr-4"
              style={{
                backgroundColor: selectedMethod === 'face' ? colors.primary : colors.borderLight,
              }}
            >
              <Ionicons 
                name="finger-print" 
                size={32} 
                color={selectedMethod === 'face' ? 'white' : colors.textTertiary} 
              />
            </View>
            <View className="flex-1">
              <Text 
                className="text-lg font-semibold mb-1"
                style={{
                  color: selectedMethod === 'face' ? colors.primary : colors.text,
                }}
              >
                Face Verification
              </Text>
              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                Use device's native Face ID for authentication
              </Text>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                • Uses device's built-in Face ID/Face Unlock{'\n'}
                • Secure and fast authentication{'\n'}
                • No photo required - uses device's Face ID directly
              </Text>
              {!faceIDAvailable && (
                <View 
                  className="mt-2 px-2 py-1 rounded-full self-start"
                  style={{ backgroundColor: colors.warningLight }}
                >
                  <Text 
                    className="text-xs font-medium"
                    style={{ color: colors.warning }}
                  >
                    Not Set Up
                  </Text>
                </View>
              )}
            </View>
            {selectedMethod === 'face' && (
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Test Face ID Button - Only show if Face ID is selected and available */}
        {selectedMethod === 'face' && faceIDAvailable && (
          <TouchableOpacity
            className="border rounded-xl p-4 mb-4"
            style={{
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary,
            }}
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
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} className="mr-2" />
              <Text 
                className="text-sm font-medium flex-1"
                style={{ color: colors.primary }}
              >
                {testingFaceID ? 'Testing Face ID...' : 'Test Face ID'}
              </Text>
              {testingFaceID && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
            <Text 
              className="text-xs mt-1"
              style={{ color: colors.primary }}
            >
              Tap to verify that Face ID is working on your device
            </Text>
          </TouchableOpacity>
        )}

        {/* Fingerprint/Biometric Option */}
        <TouchableOpacity
          className="rounded-2xl p-6 mb-4 shadow-sm border-2"
          style={{
            backgroundColor: selectedMethod === 'biometric' ? colors.primaryLight : colors.surface,
            borderColor: selectedMethod === 'biometric' ? colors.primary : colors.border,
            opacity: !biometricAvailable ? 0.5 : 1,
          }}
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
            <View 
              className="w-16 h-16 rounded-full items-center justify-center mr-4"
              style={{
                backgroundColor: selectedMethod === 'biometric' 
                  ? colors.primary 
                  : biometricAvailable 
                    ? colors.borderLight 
                    : colors.border,
              }}
            >
              <Ionicons 
                name="finger-print" 
                size={32} 
                color={
                  selectedMethod === 'biometric' ? 'white' : 
                  biometricAvailable ? colors.textTertiary : colors.textTertiary
                } 
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text 
                  className="text-lg font-semibold"
                  style={{
                    color: selectedMethod === 'biometric' ? colors.primary : colors.text,
                  }}
                >
                  Fingerprint Authentication
                </Text>
                {!biometricAvailable && (
                  <View 
                    className="ml-2 px-2 py-1 rounded-full"
                    style={{ backgroundColor: colors.warningLight }}
                  >
                    <Text 
                      className="text-xs font-medium"
                      style={{ color: colors.warning }}
                    >
                      Not Available
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                Use your fingerprint sensor for quick verification
              </Text>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                • Uses device's built-in fingerprint sensor{'\n'}
                • Fast and secure authentication{'\n'}
                • Works with fingerprint enrolled on your device
              </Text>
            </View>
            {selectedMethod === 'biometric' && (
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Information Box */}
        <View 
          className="border rounded-xl p-4 mb-6"
          style={{
            backgroundColor: colors.primaryLight,
            borderColor: colors.primary,
          }}
        >
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color={colors.primary} className="mr-2" />
            <View className="flex-1">
              <Text 
                className="text-sm font-medium mb-1"
                style={{ color: colors.primary }}
              >
                How It Works:
              </Text>
              <Text 
                className="text-xs leading-5"
                style={{ color: colors.primary }}
              >
                <Text className="font-semibold">Face ID:</Text> Uses your device's native Face ID/Face Unlock to authenticate. No photos are taken - authentication happens directly through your device's security system.{'\n\n'}
                <Text className="font-semibold">Fingerprint Authentication:</Text> Your device's fingerprint sensor verifies your identity. Your fingerprint data is stored securely on your device and never shared with the app.{'\n\n'}
                You can change this setting anytime.
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className="rounded-xl p-4 items-center"
          style={{
            backgroundColor: saving ? colors.border : colors.primary,
          }}
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

