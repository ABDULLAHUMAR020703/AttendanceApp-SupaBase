import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { saveAttendanceRecord } from '../utils/storage';
import { 
  initializeFaceAPI, 
  loadReferenceFace, 
  verifyFace, 
  areModelsLoaded 
} from '../utils/faceVerification';
import { 
  authenticateWithBiometric, 
  checkBiometricAvailability,
  getBiometricTypeName 
} from '../utils/biometricAuth';
import { getCurrentLocationWithAddress, formatAddressForDisplay } from '../utils/location';

export default function CameraScreen({ navigation, route }) {
  const { type, user, authMethod = 'face' } = route.params; // authMethod: 'face' or 'biometric'
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    if (authMethod === 'biometric') {
      checkBiometric();
    } else {
      getPermissions();
      initializeFaceVerification();
    }
  }, [authMethod]);

  const checkBiometric = async () => {
    try {
      const availability = await checkBiometricAvailability();
      setBiometricAvailable(availability.available);
      if (availability.available) {
        setBiometricType(getBiometricTypeName(availability.types));
      } else {
        // Check if it's an Expo Go limitation
        const isExpoGoError = availability.error && availability.error.includes('Expo Go');
        Alert.alert(
          'Biometric Not Available',
          isExpoGoError 
            ? 'Fingerprint authentication requires a development build and cannot be used in Expo Go. Please use Face Verification instead, or ask your developer to create a development build.'
            : (availability.error || 'Biometric authentication is not available. Please use face recognition instead.'),
          [
            { text: 'Use Face Verification', onPress: () => {
              // Automatically switch to face verification
              navigation.replace('CameraScreen', { 
                type: type,
                user: user,
                authMethod: 'face'
              });
            }},
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
      Alert.alert(
        'Error', 
        'Failed to check biometric availability. This feature may not work in Expo Go.',
        [
          { text: 'Use Face Verification', onPress: () => {
            navigation.replace('CameraScreen', { 
              type: type,
              user: user,
              authMethod: 'face'
            });
          }},
          { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const initializeFaceVerification = async () => {
    try {
      console.log('Initializing Azure Face API...');
      const initialized = await initializeFaceAPI();
      if (initialized) {
        console.log('Azure Face API initialized successfully');
      } else {
        console.warn('Azure Face API initialization failed - face verification may not work');
      }
    } catch (error) {
      console.error('Azure Face API initialization error:', error.message);
    }
  };

  const getPermissions = async () => {
    try {
      // Request camera permission if not already granted
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('Permission Required', 'Camera permission is required to take attendance photos');
          navigation.goBack();
          return;
        }
      }
      
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (locationStatus !== 'granted') {
        Alert.alert(
          'Location Permission', 
          'Location permission is recommended for accurate attendance tracking. You can still proceed without it.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Continue', onPress: () => {} }
          ]
        );
      }
    } catch (error) {
      console.error('Error getting permissions:', error);
      Alert.alert('Error', 'Failed to get required permissions');
      navigation.goBack();
    }
  };

  // Removed getCurrentLocation - now using getCurrentLocationWithAddress from utils/location.js

  const authenticateWithBiometricMethod = async () => {
    setIsLoading(true);
    setIsVerifying(true);
    setFaceVerificationStatus(null);

    try {
      // Get location first
      const currentLocation = await getCurrentLocationWithAddress();
      setLocation(currentLocation);

      // Authenticate with biometric
      const authResult = await authenticateWithBiometric(
        `Authenticate to ${type === 'checkin' ? 'check in' : 'check out'}`
      );

      setIsVerifying(false);

      if (authResult.success) {
        setFaceVerificationStatus('success');
        // For biometric, we don't have a photo, so we'll save with null photo
        Alert.alert(
          'Biometric Authentication Successful',
          `${biometricType} verified!\n\nConfirm ${type === 'checkin' ? 'check in' : 'check out'}?`,
          [
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: () => {
                setFaceVerificationStatus(null);
                setIsLoading(false);
              }
            },
            { 
              text: 'Confirm', 
              onPress: () => saveAttendance(null, currentLocation) 
            }
          ]
        );
      } else {
        setFaceVerificationStatus('failed');
        Alert.alert(
          'Authentication Failed',
          authResult.error || 'Biometric authentication failed. Please try again.',
          [
            { 
              text: 'Retry', 
              onPress: () => {
                setFaceVerificationStatus(null);
                setIsLoading(false);
              }
            },
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: () => {
                setFaceVerificationStatus(null);
                setIsLoading(false);
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      setIsVerifying(false);
      setFaceVerificationStatus('error');
      Alert.alert(
        'Error',
        'Failed to authenticate. Please try again.',
        [
          { 
            text: 'Retry', 
            onPress: () => {
              setFaceVerificationStatus(null);
              setIsLoading(false);
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: () => {
              setFaceVerificationStatus(null);
              setIsLoading(false);
            }
          }
        ]
      );
    }
  };

  const takePicture = async () => {
    if (!cameraRef) return;

    setIsLoading(true);
    setIsVerifying(true);
    setFaceVerificationStatus(null);
    
    try {
      // Take photo
      const photoResult = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Get location with address
      const currentLocation = await getCurrentLocationWithAddress();

      setPhoto(photoResult.uri);
      setLocation(currentLocation);

      // Perform face verification
      console.log('Starting face verification...');
      
      // Verify face with Azure Face API
      const verificationResult = await verifyFace(photoResult.uri, user.username);
      
      setIsVerifying(false);
      
      if (verificationResult.success) {
        setFaceVerificationStatus('success');
        Alert.alert(
          'Face Verification Successful',
          `Face verified! Confidence: ${(verificationResult.confidence * 100).toFixed(1)}%\n\nConfirm ${type === 'checkin' ? 'check in' : 'check out'}?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {
              setFaceVerificationStatus(null);
            }},
            { text: 'Confirm', onPress: () => saveAttendance(photoResult.uri, currentLocation) }
          ]
        );
      } else {
        setFaceVerificationStatus('failed');
        Alert.alert(
          'Face Not Matching',
          verificationResult.error || 'Face verification failed. Please try again with better lighting and ensure your face is clearly visible.',
          [
            { text: 'Retry', onPress: () => {
              setFaceVerificationStatus(null);
              setIsLoading(false);
              setPhoto(null);
            }},
            { text: 'Cancel', style: 'cancel', onPress: () => {
              setFaceVerificationStatus(null);
              setIsLoading(false);
              setPhoto(null);
              navigation.goBack();
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      setIsVerifying(false);
      setFaceVerificationStatus('error');
      Alert.alert(
        'Error', 
        'Failed to take photo or verify face. Please try again.',
        [
          { text: 'Retry', onPress: () => {
            setFaceVerificationStatus(null);
            setIsLoading(false);
          }},
          { text: 'Cancel', style: 'cancel', onPress: () => {
            setFaceVerificationStatus(null);
            setIsLoading(false);
          }}
        ]
      );
    }
  };

  const saveAttendance = async (photoUri, locationData) => {
    try {
      const attendanceRecord = {
        id: Date.now().toString(),
        username: user.username,
        type: type,
        timestamp: new Date().toISOString(),
        photo: photoUri,
        location: locationData,
        authMethod: authMethod, // Store which authentication method was used
      };

      await saveAttendanceRecord(attendanceRecord);
      
      Alert.alert(
        'Success',
        `Successfully ${type === 'checkin' ? 'checked in' : 'checked out'}!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance record');
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4">Requesting permissions...</Text>
      </View>
    );
  }

  // Biometric authentication view
  if (authMethod === 'biometric') {
    if (!biometricAvailable) {
      return (
        <View className="flex-1 justify-center items-center bg-gray-900 p-6">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-white mt-4">Checking biometric availability...</Text>
        </View>
      );
    }

    return (
      <View className="flex-1 bg-gray-900">
        {/* Header */}
        <View className="bg-gray-800 px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="p-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">
            {type === 'checkin' ? 'Check In' : 'Check Out'}
          </Text>
          <View className="w-8" />
        </View>

        {/* Biometric Authentication View */}
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-gray-800 rounded-2xl p-8 items-center max-w-sm">
            <View className="w-24 h-24 bg-primary-500 rounded-full items-center justify-center mb-6">
              <Ionicons name="finger-print" size={48} color="white" />
            </View>
            
            <Text className="text-white text-xl font-semibold mb-2 text-center">
              {type === 'checkin' ? 'Check In' : 'Check Out'} with {biometricType}
            </Text>
            <Text className="text-gray-400 text-center text-sm mb-6">
              Use your {biometricType.toLowerCase()} to authenticate
            </Text>

            {/* Location Display */}
            <View className="bg-black bg-opacity-50 rounded-full p-3 mb-6 w-full">
              <Text className="text-white text-sm text-center">
                {location ? (
                  location.address ? 
                    `📍 ${formatAddressForDisplay(location.address, 40)}` : 
                    '📍 Location captured'
                ) : '📍 Getting location...'}
              </Text>
            </View>

            {/* Verification Status */}
            {faceVerificationStatus && (
              <View className={`bg-black bg-opacity-50 rounded-full p-4 mb-6 w-full ${
                faceVerificationStatus === 'success' ? 'bg-green-500 bg-opacity-50' :
                faceVerificationStatus === 'failed' ? 'bg-red-500 bg-opacity-50' :
                'bg-yellow-500 bg-opacity-50'
              }`}>
                <Text className="text-white text-sm text-center">
                  {faceVerificationStatus === 'success' ? `✅ ${biometricType} verified!` :
                   faceVerificationStatus === 'failed' ? '❌ Authentication failed' :
                   '⚠️ Verification error'}
                </Text>
              </View>
            )}

            {/* Authenticate Button */}
            <TouchableOpacity
              className={`w-full rounded-xl p-4 items-center ${
                isLoading ? 'bg-gray-600' : 'bg-primary-500'
              }`}
              onPress={authenticateWithBiometricMethod}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={32} color="white" />
                  <Text className="text-white font-semibold mt-2">
                    Authenticate with {biometricType}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="text-gray-400 text-center text-xs mt-4">
              User: {user.username}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Face recognition view (original camera view)
  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900 p-6">
        <Ionicons name="camera-off" size={64} color="#ef4444" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Camera access denied
        </Text>
        <Text className="text-gray-400 text-center mt-2">
          Please enable camera permission to take attendance photos
        </Text>
        <TouchableOpacity
          className="bg-primary-500 rounded-xl px-6 py-3 mt-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="bg-gray-800 px-6 py-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="p-2"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">
          {type === 'checkin' ? 'Check In' : 'Check Out'}
        </Text>
        <View className="w-8" />
      </View>

      {/* Camera View */}
      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          facing="front"
          ref={(ref) => setCameraRef(ref)}
        />
        
        {/* Overlay with absolute positioning */}
        <View className="absolute inset-0 flex-1 justify-between p-6">
          {/* Top overlay */}
          <View className="bg-black bg-opacity-50 rounded-xl p-4">
            <Text className="text-white text-center font-semibold">
              {type === 'checkin' ? 'Check In' : 'Check Out'} - Photo Required
            </Text>
            <Text className="text-gray-300 text-center text-sm mt-1">
              Take a selfie for attendance verification
            </Text>
            <Text className="text-gray-400 text-center text-xs mt-1">
              User: {user.username}
            </Text>
          </View>

          {/* Bottom controls */}
          <View className="items-center">
            <View className="bg-black bg-opacity-50 rounded-full p-4 mb-4">
              <Text className="text-white text-sm text-center">
                {location ? (
                  location.address ? 
                    `📍 ${formatAddressForDisplay(location.address, 40)}` : 
                    '📍 Location captured'
                ) : '📍 Getting location...'}
              </Text>
            </View>

            {/* Face Verification Status */}
            {faceVerificationStatus && (
              <View className={`bg-black bg-opacity-50 rounded-full p-4 mb-4 ${
                faceVerificationStatus === 'success' ? 'bg-green-500 bg-opacity-50' :
                faceVerificationStatus === 'failed' ? 'bg-red-500 bg-opacity-50' :
                faceVerificationStatus === 'skipped' ? 'bg-blue-500 bg-opacity-50' :
                'bg-yellow-500 bg-opacity-50'
              }`}>
                <Text className="text-white text-sm text-center">
                  {faceVerificationStatus === 'success' ? '✅ Face verified!' :
                   faceVerificationStatus === 'failed' ? '❌ Face verification failed' :
                   faceVerificationStatus === 'skipped' ? '📸 Photo captured' :
                   '⚠️ Verification error'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              className={`w-20 h-20 rounded-full items-center justify-center ${
                isLoading ? 'bg-gray-600' : 'bg-white'
              }`}
              onPress={takePicture}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#3b82f6" />
              ) : (
                <View className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={32} color="white" />
                </View>
              )}
            </TouchableOpacity>
            
            <Text className="text-white text-center mt-4">
              {isLoading ? (isVerifying ? 'Processing...' : 'Processing...') : 'Tap to capture photo'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
