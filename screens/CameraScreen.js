import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { saveAttendanceRecord } from '../utils/storage';

export default function CameraScreen({ navigation, route }) {
  const { type, user, onComplete } = route.params;
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    try {
      // Request camera permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (cameraStatus !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take attendance photos');
        navigation.goBack();
        return;
      }

      if (locationStatus !== 'granted') {
        Alert.alert(
          'Location Permission', 
          'Location permission is recommended for accurate attendance tracking. You can still proceed without it.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Continue', onPress: () => setHasPermission(true) }
          ]
        );
        return;
      }

      setHasPermission(true);
    } catch (error) {
      console.error('Error getting permissions:', error);
      Alert.alert('Error', 'Failed to get required permissions');
      navigation.goBack();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const takePicture = async () => {
    if (!cameraRef) return;

    setIsLoading(true);
    try {
      // Take photo
      const photoResult = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Get location
      const currentLocation = await getCurrentLocation();

      setPhoto(photoResult.uri);
      setLocation(currentLocation);

      // Show confirmation
      Alert.alert(
        'Confirm Attendance',
        `Are you sure you want to ${type === 'checkin' ? 'check in' : 'check out'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => saveAttendance(photoResult.uri, currentLocation) }
        ]
      );
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setIsLoading(false);
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
      };

      await saveAttendanceRecord(attendanceRecord);
      
      Alert.alert(
        'Success',
        `Successfully ${type === 'checkin' ? 'checked in' : 'checked out'}!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (onComplete) onComplete();
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

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4">Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
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
        <Camera
          style={{ flex: 1 }}
          type={Camera.Constants.Type.front}
          ref={(ref) => setCameraRef(ref)}
        >
          {/* Overlay */}
          <View className="flex-1 justify-between p-6">
            {/* Top overlay */}
            <View className="bg-black bg-opacity-50 rounded-xl p-4">
              <Text className="text-white text-center font-semibold">
                Take a selfie for {type === 'checkin' ? 'check in' : 'check out'}
              </Text>
              <Text className="text-gray-300 text-center text-sm mt-1">
                Make sure your face is clearly visible
              </Text>
            </View>

            {/* Bottom controls */}
            <View className="items-center">
              <View className="bg-black bg-opacity-50 rounded-full p-4 mb-4">
                <Text className="text-white text-sm text-center">
                  {location ? '📍 Location captured' : '📍 Getting location...'}
                </Text>
              </View>
              
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
                {isLoading ? 'Processing...' : 'Tap to capture'}
              </Text>
            </View>
          </View>
        </Camera>
      </View>
    </View>
  );
}
