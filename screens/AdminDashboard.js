import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAttendanceRecords, clearAllAttendanceRecords } from '../utils/storage';
import { exportAttendanceToCSV } from '../utils/export';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import EmployeeManagement from './EmployeeManagement';
import CalendarScreen from './CalendarScreen';
import HRDashboard from './HRDashboard';
import { getUnreadNotificationCount } from '../utils/notifications';

export default function AdminDashboard({ route, navigation }) {
  const { user, initialTab, openLeaveRequests } = route.params || {};
  const { handleLogout } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState(initialTab || 'attendance'); // 'attendance', 'employees', 'calendar', or 'hr'
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, checkin, checkout
  const [isExporting, setIsExporting] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    loadRecords();
    loadNotificationCount();
    
    // Set up interval to check notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      loadNotificationCount();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  // Handle navigation params for opening leave requests
  useEffect(() => {
    if (initialTab === 'employees' && openLeaveRequests) {
      setActiveTab('employees');
    }
  }, [initialTab, openLeaveRequests]);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, filter]);

  const loadRecords = async () => {
    try {
      const allRecords = await getAttendanceRecords();
      
      // Sort by timestamp (newest first)
      const sortedRecords = allRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecords(sortedRecords);
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('Error', 'Failed to load attendance records');
    }
  };

  const loadNotificationCount = async () => {
    try {
      const count = await getUnreadNotificationCount(user.username);
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(record => record.type === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(record => 
        record.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRecords();
    setIsRefreshing(false);
  };

  const handleExport = async () => {
    if (records.length === 0) {
      Alert.alert('No Data', 'There are no attendance records to export');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportAttendanceToCSV();
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `CSV file has been saved to: ${result.fileName}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred during export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Records',
      'Are you sure you want to delete all attendance records? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllAttendanceRecords();
              await loadRecords();
              Alert.alert('Success', 'All records have been cleared');
            } catch (error) {
              console.error('Error clearing records:', error);
              Alert.alert('Error', 'Failed to clear records');
            }
          }
        }
      ]
    );
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
              <Text className="text-lg font-semibold text-gray-800">
                {item.username}
              </Text>
              <Text className="text-sm text-gray-500">{time}</Text>
            </View>
            
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-600 mr-2">{date}</Text>
              <View className={`px-2 py-1 rounded-full ${
                item.type === 'checkin' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Text className={`text-xs font-medium ${
                  item.type === 'checkin' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {item.type === 'checkin' ? 'Check In' : 'Check Out'}
                </Text>
              </View>
            </View>
            
            {/* Location */}
            {item.location && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-1">
                  {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
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

  const TabButton = ({ title, value, isActive, icon }) => (
    <TouchableOpacity
      className={`flex-1 flex-row items-center justify-center py-3 ${
        isActive ? 'border-b-2 border-primary-500' : ''
      }`}
      onPress={() => setActiveTab(value)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? '#3b82f6' : '#6b7280'} 
      />
      <Text className={`ml-2 font-medium ${
        isActive ? 'text-primary-500' : 'text-gray-500'
      }`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.surface }}>
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1">
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {user.role === 'super_admin' ? 'Super Admin Dashboard' : 
               user.role === 'manager' ? `${user.department || 'Department'} Manager Dashboard` : 
               'Admin Dashboard'}
            </Text>
            {user.role === 'manager' && user.department && (
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Managing: {user.department} Department
              </Text>
            )}
          </View>
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationsScreen', { user: user })}
              className="p-2"
              style={{ position: 'relative' }}
            >
              <Ionicons name="notifications" size={24} color={colors.primary} />
              {unreadNotificationCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: colors.error,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ThemeSettingsScreen', { user: user })}
              className="p-2"
            >
              <Ionicons name="color-palette" size={24} color={colors.primary} />
            </TouchableOpacity>
            {activeTab === 'attendance' && (
              <View className="flex-row space-x-2">
                <TouchableOpacity
                  className="bg-blue-500 rounded-xl px-4 py-2"
                  onPress={() => navigation.navigate('ManualAttendance', { user: user })}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="create-outline" size={16} color="white" />
                    <Text className="text-white font-semibold ml-1">Manual</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-green-500 rounded-xl px-4 py-2"
                  onPress={handleExport}
                  disabled={isExporting || records.length === 0}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="download-outline" size={16} color="white" />
                    <Text className="text-white font-semibold ml-1">
                      {isExporting ? 'Exporting...' : 'Export CSV'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="bg-red-500 rounded-xl px-4 py-2"
                  onPress={handleClearAll}
                  disabled={records.length === 0}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="trash-outline" size={16} color="white" />
                    <Text className="text-white font-semibold ml-1">Clear All</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row border-b border-gray-200">
          <TabButton 
            title="Attendance" 
            value="attendance" 
            isActive={activeTab === 'attendance'}
            icon="time-outline"
          />
          <TabButton 
            title="Employees" 
            value="employees" 
            isActive={activeTab === 'employees'}
            icon="people-outline"
          />
          <TabButton 
            title="Calendar" 
            value="calendar" 
            isActive={activeTab === 'calendar'}
            icon="calendar-outline"
          />
          <TabButton 
            title="HR" 
            value="hr" 
            isActive={activeTab === 'hr'}
            icon="briefcase-outline"
          />
        </View>

        {/* Search Bar - Only for Attendance Tab */}
        {activeTab === 'attendance' && (
          <>
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
              <Ionicons name="search-outline" size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Search by username..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {/* Filter Buttons */}
            <View className="flex-row space-x-2">
              <FilterButton title="All" value="all" isActive={filter === 'all'} />
              <FilterButton title="Check In" value="checkin" isActive={filter === 'checkin'} />
              <FilterButton title="Check Out" value="checkout" isActive={filter === 'checkout'} />
            </View>
          </>
        )}
      </View>

      {/* Conditional Content */}
      {activeTab === 'hr' ? (
        <View className="flex-1">
          <HRDashboard navigation={navigation} route={route} />
        </View>
      ) : activeTab === 'calendar' ? (
        <View className="flex-1">
          <CalendarScreen navigation={navigation} route={route} />
        </View>
      ) : activeTab === 'attendance' ? (
        <>
          {/* Stats */}
          <View className="bg-white mx-4 my-4 rounded-xl p-4 shadow-sm">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary-500">{records.length}</Text>
                <Text className="text-gray-600 text-sm">Total Records</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-green-500">
                  {records.filter(r => r.type === 'checkin').length}
                </Text>
                <Text className="text-gray-600 text-sm">Check Ins</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-red-500">
                  {records.filter(r => r.type === 'checkout').length}
                </Text>
                <Text className="text-gray-600 text-sm">Check Outs</Text>
              </View>
            </View>
          </View>

          {/* Records List */}
          {filteredRecords.length > 0 ? (
            <FlatList
              data={filteredRecords}
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
              <Ionicons name="people-outline" size={64} color="#d1d5db" />
              <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
                {records.length === 0 
                  ? 'No attendance records found'
                  : 'No records match your search'
                }
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                {records.length === 0 
                  ? 'Employees need to check in to create records'
                  : 'Try adjusting your search or filter criteria'
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
          {filteredRecords.length > 0 && (
            <View className="bg-white p-4 border-t border-gray-200">
              <Text className="text-gray-600 text-center">
                Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </>
      ) : (
        <EmployeeManagement route={{ params: { user, openLeaveRequests } }} />
      )}
    </View>
  );
}
