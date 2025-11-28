import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserAttendanceRecords } from '../utils/storage';

export default function AttendanceHistory({ route }) {
  const { user } = route.params;
  const [records, setRecords] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, checkin, checkout

  useEffect(() => {
    loadRecords();
  }, [filter]);

  const loadRecords = async () => {
    try {
      // Use username to get records
      const allRecords = await getUserAttendanceRecords(user.username);
      
      // Sort by timestamp (newest first)
      const sortedRecords = allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Apply filter
      let filteredRecords = sortedRecords;
      if (filter !== 'all') {
        filteredRecords = sortedRecords.filter(record => record.type === filter);
      }
      
      setRecords(filteredRecords);
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRecords();
    setIsRefreshing(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const getStatusColor = (type) => {
    return type === 'checkin' ? '#10b981' : '#ef4444';
  };

  const getStatusIcon = (type) => {
    return type === 'checkin' ? 'log-in' : 'log-out';
  };

  const renderRecord = ({ item }) => {
    const { date, time } = formatDate(item.timestamp);
    
    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-start">
          {/* Status Indicator */}
          <View className="mr-4">
            <View 
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: `${getStatusColor(item.type)}20` }}
            >
              <Ionicons 
                name={getStatusIcon(item.type)} 
                size={20} 
                color={getStatusColor(item.type)} 
              />
            </View>
          </View>

          {/* Record Details */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-gray-800 capitalize">
                {item.type === 'checkin' ? 'Check In' : 'Check Out'}
              </Text>
              <Text className="text-sm text-gray-500">{time}</Text>
            </View>
            
            <Text className="text-gray-600 mb-2">{date}</Text>
            
            {/* Location */}
            {item.location && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1 flex-1">
                  {item.location.address || 
                   `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}
                </Text>
              </View>
            )}

            {/* Photo */}
            {item.photo && (
              <View className="mt-2">
                <Image 
                  source={{ uri: item.photo }} 
                  className="w-16 h-16 rounded-lg"
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const FilterButton = ({ title, value, isActive }) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full ${
        isActive ? 'bg-primary-500' : 'bg-gray-200'
      }`}
      onPress={() => setFilter(value)}
    >
      <Text className={`font-medium ${
        isActive ? 'text-white' : 'text-gray-700'
      }`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-800 mb-4">
          Attendance History
        </Text>
        
        {/* Filter Buttons */}
        <View className="flex-row space-x-2">
          <FilterButton title="All" value="all" isActive={filter === 'all'} />
          <FilterButton title="Check In" value="checkin" isActive={filter === 'checkin'} />
          <FilterButton title="Check Out" value="checkout" isActive={filter === 'checkout'} />
        </View>
      </View>

      {/* Records List */}
      {records.length > 0 ? (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="time-outline" size={64} color="#d1d5db" />
          <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
            No attendance records found
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            {filter === 'all' 
              ? 'Start by checking in to create your first record'
              : `No ${filter} records found`
            }
          </Text>
          <TouchableOpacity
            className="bg-primary-500 rounded-xl px-6 py-3 mt-6"
            onPress={onRefresh}
          >
            <Text className="text-white font-semibold">Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary */}
      {records.length > 0 && (
        <View className="bg-white p-4 border-t border-gray-200">
          <Text className="text-gray-600 text-center">
            Showing {records.length} record{records.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
