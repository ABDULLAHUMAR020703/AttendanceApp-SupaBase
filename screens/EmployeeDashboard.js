import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserAttendanceRecords } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

export default function EmployeeDashboard({ navigation, route }) {
  const { user } = route.params;
  const { handleLogout } = useAuth();
  const [lastRecord, setLastRecord] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadLastRecord();
  }, []);

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

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLastRecord();
    setIsRefreshing(false);
  };

  const handleCheckIn = () => {
    navigation.navigate('CameraScreen', { 
      type: 'checkin',
      user: user,
      onComplete: loadLastRecord 
    });
  };

  const handleCheckOut = () => {
    navigation.navigate('CameraScreen', { 
      type: 'checkout',
      user: user,
      onComplete: loadLastRecord 
    });
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
                  {canCheckIn ? 'Start your work day' : 'Already checked in'}
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
                  {canCheckOut ? 'End your work day' : 'Must check in first'}
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
        </View>

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
    </ScrollView>
  );
}
