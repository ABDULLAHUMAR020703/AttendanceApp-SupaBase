import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserAttendanceRecords } from '../utils/storage';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont, normalize } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';

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
      <View 
        className="bg-white rounded-xl shadow-sm"
        style={{
          padding: responsivePadding(16),
          marginBottom: spacing.md,
          marginHorizontal: spacing.sm,
        }}
      >
        <View className="flex-row items-start">
          {/* Status Indicator */}
          <View style={{ marginRight: spacing.md }}>
            <View 
              className="rounded-full items-center justify-center"
              style={{ 
                width: componentSize.avatarMedium,
                height: componentSize.avatarMedium,
                backgroundColor: `${getStatusColor(item.type)}20` 
              }}
            >
              <Ionicons 
                name={getStatusIcon(item.type)} 
                size={iconSize.md} 
                color={getStatusColor(item.type)} 
              />
            </View>
          </View>

          {/* Record Details */}
          <View className="flex-1" style={{ flexShrink: 1 }}>
            <View className="flex-row items-center justify-between" style={{ marginBottom: spacing.xs }}>
              <Text 
                className="font-semibold text-gray-800 capitalize"
                style={{ fontSize: responsiveFont(18) }}
              >
                {item.type === 'checkin' ? 'Check In' : 'Check Out'}
              </Text>
              <Text 
                className="text-gray-500"
                style={{ fontSize: responsiveFont(12) }}
              >
                {time}
              </Text>
            </View>
            
            <Text 
              className="text-gray-600"
              style={{ 
                fontSize: responsiveFont(14),
                marginBottom: spacing.xs,
              }}
            >
              {date}
            </Text>
            
            {/* Location */}
            {item.location && (
              <View className="flex-row items-center" style={{ marginBottom: spacing.xs }}>
                <Ionicons name="location-outline" size={iconSize.sm} color="#6b7280" />
                <Text 
                  className="text-gray-600 ml-1 flex-1"
                  style={{ fontSize: responsiveFont(12) }}
                  numberOfLines={1}
                >
                  {item.location.address || 
                   (item.location.latitude !== undefined && item.location.longitude !== undefined
                     ? `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`
                     : 'Location unavailable')}
                </Text>
              </View>
            )}

            {/* Photo */}
            {item.photo && (
              <View style={{ marginTop: spacing.xs }}>
                <Image 
                  source={{ uri: item.photo }} 
                  className="rounded-lg"
                  style={{ 
                    width: componentSize.avatarLarge,
                    height: componentSize.avatarLarge,
                  }}
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
      className={`rounded-full ${
        isActive ? 'bg-primary-500' : 'bg-gray-200'
      }`}
      style={{
        paddingHorizontal: responsivePadding(16),
        paddingVertical: spacing.xs,
        marginRight: spacing.xs,
      }}
      onPress={() => setFilter(value)}
    >
      <Text 
        className={`font-medium ${
        isActive ? 'text-white' : 'text-gray-700'
        }`}
        style={{ fontSize: responsiveFont(14) }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View 
        className="bg-white shadow-sm"
        style={{
          paddingHorizontal: responsivePadding(24),
          paddingVertical: responsivePadding(16),
        }}
      >
        <View className="flex-row items-center" style={{ marginBottom: spacing.md }}>
          <Logo size="small" style={{ marginRight: spacing.sm }} />
          <Text 
            className="font-bold text-gray-800"
            style={{ 
              fontSize: responsiveFont(20),
            }}
          >
          Attendance History
        </Text>
        </View>
        
        {/* Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: responsivePadding(16) }}
        >
          <View className="flex-row">
          <FilterButton title="All" value="all" isActive={filter === 'all'} />
          <FilterButton title="Check In" value="checkin" isActive={filter === 'checkin'} />
          <FilterButton title="Check Out" value="checkout" isActive={filter === 'checkout'} />
        </View>
        </ScrollView>
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
        <View 
          className="flex-1 justify-center items-center"
          style={{ paddingHorizontal: responsivePadding(24) }}
        >
          <Ionicons name="time-outline" size={iconSize['4xl']} color="#d1d5db" />
          <Text 
            className="font-semibold text-gray-500 text-center"
            style={{ 
              fontSize: responsiveFont(20),
              marginTop: spacing.md,
            }}
          >
            No attendance records found
          </Text>
          <Text 
            className="text-gray-400 text-center"
            style={{ 
              fontSize: responsiveFont(14),
              marginTop: spacing.xs,
            }}
          >
            {filter === 'all' 
              ? 'Start by checking in to create your first record'
              : `No ${filter} records found`
            }
          </Text>
          <TouchableOpacity
            className="bg-primary-500 rounded-xl"
            style={{
              paddingHorizontal: responsivePadding(24),
              paddingVertical: spacing.md,
              marginTop: spacing.lg,
            }}
            onPress={onRefresh}
          >
            <Text 
              className="text-white font-semibold"
              style={{ fontSize: responsiveFont(16) }}
            >
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary */}
      {records.length > 0 && (
        <View 
          className="bg-white border-t border-gray-200"
          style={{ padding: responsivePadding(16) }}
        >
          <Text 
            className="text-gray-600 text-center"
            style={{ fontSize: responsiveFont(14) }}
          >
            Showing {records.length} record{records.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Trademark */}
      <View style={{ padding: responsivePadding(16) }}>
        <Trademark position="bottom" />
      </View>
    </View>
  );
}
