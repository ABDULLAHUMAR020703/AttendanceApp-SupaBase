import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserAttendanceRecords } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { 
  getEmployeeByUsername, 
  createWorkModeRequest,
  getWorkModeRequests 
} from '../utils/employees';
import { 
  getAllWorkModes, 
  getWorkModeLabel, 
  getWorkModeColor,
  getWorkModeIcon 
} from '../utils/workModes';
import { 
  checkBiometricAvailability, 
  hasFingerprintSupport,
  getBiometricTypeName 
} from '../utils/biometricAuth';
import { getPreferredAuthMethod } from '../utils/authPreferences';

export default function EmployeeDashboard({ navigation, route }) {
  const { user } = route.params;
  const { handleLogout } = useAuth();
  const [lastRecord, setLastRecord] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [showWorkModeModal, setShowWorkModeModal] = useState(false);
  const [selectedWorkMode, setSelectedWorkMode] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [hasFingerprint, setHasFingerprint] = useState(false);

  useEffect(() => {
    loadData();
    // Delay biometric check to avoid crashes on app load
    setTimeout(() => {
      checkBiometricSupport();
    }, 1000);
    
    // Reload data when screen comes into focus (returning from CameraScreen)
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const checkBiometricSupport = async () => {
    try {
      // Wrap in try-catch to prevent crashes
      const availability = await checkBiometricAvailability();
      setBiometricAvailable(availability.available);
      
      if (availability.available) {
        const fingerprintSupport = await hasFingerprintSupport();
        setHasFingerprint(fingerprintSupport);
        setBiometricType(getBiometricTypeName(availability.types));
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      // Silently fail - assume biometric not available
      setBiometricAvailable(false);
    }
  };

  const loadData = async () => {
    await Promise.all([
      loadLastRecord(),
      loadEmployeeData(),
      loadMyRequests()
    ]);
  };

  const loadLastRecord = async () => {
    try {
      const records = await getUserAttendanceRecords(user.username);
      if (records.length > 0) {
        // Sort by timestamp and get the most recent
        const sortedRecords = records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLastRecord(sortedRecords[0]);
      }
    } catch (error) {
      console.error('Error loading last record:', error);
    }
  };

  const loadEmployeeData = async () => {
    try {
      const employeeData = await getEmployeeByUsername(user.username);
      setEmployee(employeeData);
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadMyRequests = async () => {
    try {
      const requests = await getWorkModeRequests();
      const myRequests = requests.filter(req => req.employeeId === user.username);
      setMyRequests(myRequests);
    } catch (error) {
      console.error('Error loading my requests:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleCheckIn = async () => {
    // Get user's preferred authentication method
    const authMethod = await getPreferredAuthMethod(user.username, biometricAvailable);
    navigation.navigate('CameraScreen', { 
      type: 'checkin',
      user: user,
      authMethod: authMethod
    });
  };

  const handleCheckOut = async () => {
    // Get user's preferred authentication method
    const authMethod = await getPreferredAuthMethod(user.username, biometricAvailable);
    navigation.navigate('CameraScreen', { 
      type: 'checkout',
      user: user,
      authMethod: authMethod
    });
  };

  const handleWorkModeRequest = (workMode) => {
    setSelectedWorkMode(workMode);
    setShowWorkModeModal(true);
  };

  const submitWorkModeRequest = async () => {
    if (!selectedWorkMode || !requestReason.trim()) {
      Alert.alert('Error', 'Please select a work mode and provide a reason');
      return;
    }

    try {
      const success = await createWorkModeRequest(
        user.username,
        selectedWorkMode,
        requestReason.trim()
      );

      if (success) {
        Alert.alert(
          'Request Submitted',
          'Your work mode change request has been submitted for admin approval.'
        );
        setShowWorkModeModal(false);
        setSelectedWorkMode(null);
        setRequestReason('');
        await loadMyRequests();
      } else {
        Alert.alert('Error', 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting work mode request:', error);
      Alert.alert('Error', 'Failed to submit request');
    }
  };

  const handleViewHistory = () => {
    navigation.navigate('AttendanceHistory', { user: user });
  };

  const handleLogoutPress = () => {
    handleLogout();
  };

  const canCheckIn = !lastRecord || lastRecord.type === 'checkout';
  const canCheckOut = lastRecord && lastRecord.type === 'checkin';

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View className="p-6">
        {/* Welcome Header */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-4">
              <Ionicons name="person" size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">
                Welcome, {user.username}!
              </Text>
              <Text className="text-gray-600">Employee Dashboard</Text>
            </View>
          </View>
        </View>

        {/* Current Status */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Current Status
          </Text>
          {lastRecord ? (
            <View className="flex-row items-center">
              <View className={`w-4 h-4 rounded-full mr-3 ${
                lastRecord.type === 'checkin' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <View className="flex-1">
                <Text className="text-gray-800 font-medium">
                  {lastRecord.type === 'checkin' ? 'Checked In' : 'Checked Out'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {new Date(lastRecord.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full mr-3 bg-gray-400" />
              <Text className="text-gray-600">No attendance records yet</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="space-y-4">
          {/* Check In Button */}
          <TouchableOpacity
            className={`rounded-2xl p-6 shadow-sm ${
              canCheckIn 
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`}
            onPress={handleCheckIn}
            disabled={!canCheckIn}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-4">
                <Ionicons 
                  name="log-in-outline" 
                  size={24} 
                  color={canCheckIn ? "#10b981" : "#9ca3af"} 
                />
              </View>
              <View className="flex-1">
                <Text className={`text-lg font-semibold ${
                  canCheckIn ? 'text-white' : 'text-gray-500'
                }`}>
                  Check In
                </Text>
                <Text className={`text-sm ${
                  canCheckIn ? 'text-green-100' : 'text-gray-400'
                }`}>
                  {canCheckIn 
                    ? (biometricAvailable 
                        ? `Use ${biometricType.toLowerCase()}` 
                        : 'Take a selfie for verification')
                    : 'Already checked in'}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={canCheckIn ? "white" : "#9ca3af"} 
              />
            </View>
          </TouchableOpacity>

          {/* Check Out Button */}
          <TouchableOpacity
            className={`rounded-2xl p-6 shadow-sm ${
              canCheckOut 
                ? 'bg-red-500' 
                : 'bg-gray-300'
            }`}
            onPress={handleCheckOut}
            disabled={!canCheckOut}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-4">
                <Ionicons 
                  name="log-out-outline" 
                  size={24} 
                  color={canCheckOut ? "#ef4444" : "#9ca3af"} 
                />
              </View>
              <View className="flex-1">
                <Text className={`text-lg font-semibold ${
                  canCheckOut ? 'text-white' : 'text-gray-500'
                }`}>
                  Check Out
                </Text>
                <Text className={`text-sm ${
                  canCheckOut ? 'text-red-100' : 'text-gray-400'
                }`}>
                  {canCheckOut 
                    ? (biometricAvailable 
                        ? `Use ${biometricType.toLowerCase()}` 
                        : 'Take a selfie for verification')
                    : 'Must check in first'}
                </Text>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={canCheckOut ? "white" : "#9ca3af"} 
              />
            </View>
          </TouchableOpacity>

          {/* View History Button */}
          <TouchableOpacity
            className="bg-white rounded-2xl p-6 shadow-sm"
            onPress={handleViewHistory}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="time-outline" size={24} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">
                  View History
                </Text>
                <Text className="text-gray-600 text-sm">
                  Check your attendance records
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>

          {/* Authentication Settings Button */}
          <TouchableOpacity
            className="bg-white rounded-2xl p-6 shadow-sm mt-4"
            onPress={() => navigation.navigate('AuthMethodSelection', { user: user })}
          >
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="finger-print" size={24} color="#9333ea" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">
                  Authentication Settings
                </Text>
                <Text className="text-gray-600 text-sm">
                  Choose face verification or fingerprint
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Work Mode Section */}
        {employee && (
          <View className="bg-white rounded-2xl p-6 mt-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Work Mode
            </Text>
            
            {/* Current Work Mode */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons 
                  name={getWorkModeIcon(employee.workMode)} 
                  size={20} 
                  color={getWorkModeColor(employee.workMode)} 
                />
                <View className="ml-3">
                  <Text className="font-medium text-gray-800">
                    Current: {getWorkModeLabel(employee.workMode)}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {employee.department} • {employee.position}
                  </Text>
                </View>
              </View>
            </View>

            {/* Work Mode Request Buttons */}
            <Text className="text-sm text-gray-600 mb-3">
              Request a different work mode:
            </Text>
            <View className="space-y-2">
              {getAllWorkModes()
                .filter(mode => mode.value !== employee.workMode)
                .map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    className="flex-row items-center p-3 bg-gray-50 rounded-lg"
                    onPress={() => handleWorkModeRequest(mode.value)}
                  >
                    <Ionicons 
                      name={mode.icon} 
                      size={20} 
                      color={mode.color} 
                    />
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-gray-800">
                        {mode.label}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {mode.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                  </TouchableOpacity>
                ))}
            </View>

            {/* My Requests */}
            {myRequests.length > 0 && (
              <View className="mt-4 pt-4 border-t border-gray-200">
                <Text className="text-sm font-medium text-gray-800 mb-2">
                  My Requests ({myRequests.length})
                </Text>
                {myRequests.slice(0, 2).map((request) => (
                  <View key={request.id} className="flex-row items-center justify-between py-2">
                    <View>
                      <Text className="text-sm text-gray-600">
                        {getWorkModeLabel(request.requestedMode)}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full ${
                      request.status === 'pending' ? 'bg-yellow-100' :
                      request.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        request.status === 'pending' ? 'text-yellow-800' :
                        request.status === 'approved' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))}
                {myRequests.length > 2 && (
                  <Text className="text-xs text-gray-500 mt-1">
                    +{myRequests.length - 2} more requests
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View className="bg-white rounded-2xl p-6 mt-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Quick Stats
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-primary-500">0</Text>
              <Text className="text-gray-600 text-sm">Days Worked</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">0</Text>
              <Text className="text-gray-600 text-sm">Hours Logged</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">0</Text>
              <Text className="text-gray-600 text-sm">This Month</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Work Mode Request Modal */}
      <Modal
        visible={showWorkModeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWorkModeModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Request Work Mode Change
            </Text>
            
            {selectedWorkMode && (
              <View className="mb-4">
                <Text className="text-gray-600 mb-2">
                  Requesting: <Text className="font-medium">{getWorkModeLabel(selectedWorkMode)}</Text>
                </Text>
                <Text className="text-sm text-gray-500">
                  {getAllWorkModes().find(mode => mode.value === selectedWorkMode)?.description}
                </Text>
              </View>
            )}
            
            <Text className="text-gray-800 font-medium mb-2">
              Reason for request:
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 text-gray-800"
              placeholder="Please explain why you need this work mode change..."
              value={requestReason}
              onChangeText={setRequestReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg p-3 flex-1"
                onPress={() => {
                  setShowWorkModeModal(false);
                  setSelectedWorkMode(null);
                  setRequestReason('');
                }}
              >
                <Text className="text-center font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-primary-500 rounded-lg p-3 flex-1"
                onPress={submitWorkModeRequest}
              >
                <Text className="text-center font-medium text-white">Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
