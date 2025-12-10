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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAttendanceRecords, clearAllAttendanceRecords } from '../utils/storage';
import { exportAttendanceToCSV } from '../utils/export';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import EmployeeManagement from './EmployeeManagement';
import CalendarScreen from './CalendarScreen';
import HRDashboard from './HRDashboard';
import { getUnreadNotificationCount } from '../utils/notifications';
import { getPendingSignupCount } from '../utils/signupRequests';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont, wp, isSmallScreen, normalize } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';
import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard({ route }) {
  const navigation = useNavigation();
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
  const [pendingSignupCount, setPendingSignupCount] = useState(0);

  useEffect(() => {
    loadRecords();
    loadNotificationCount();
    loadPendingSignupCount();
    
    // Set up interval to check notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      loadNotificationCount();
      loadPendingSignupCount();
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

  const loadPendingSignupCount = async () => {
    try {
      const count = await getPendingSignupCount();
      setPendingSignupCount(count);
    } catch (error) {
      console.error('Error loading pending signup count:', error);
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
      <View 
        className="bg-white rounded-xl mb-3 shadow-sm"
        style={{ 
          padding: responsivePadding(16),
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
                className="font-semibold text-gray-800"
                style={{ fontSize: responsiveFont(18), flexShrink: 1 }}
                numberOfLines={1}
              >
                {item.username}
              </Text>
              <Text 
                className="text-gray-500"
                style={{ fontSize: responsiveFont(12), marginLeft: spacing.xs }}
              >
                {time}
              </Text>
            </View>
            
            <View className="flex-row items-center flex-wrap" style={{ marginBottom: spacing.xs }}>
              <Text 
                className="text-gray-600"
                style={{ fontSize: responsiveFont(14), marginRight: spacing.xs }}
              >
                {date}
              </Text>
              <View 
                className={`rounded-full ${
                item.type === 'checkin' ? 'bg-green-100' : 'bg-red-100'
                }`}
                style={{ 
                  paddingHorizontal: spacing.xs,
                  paddingVertical: spacing.xs / 2,
                }}
              >
                <Text 
                  className={`font-medium ${
                  item.type === 'checkin' ? 'text-green-800' : 'text-red-800'
                  }`}
                  style={{ fontSize: responsiveFont(10) }}
                >
                  {item.type === 'checkin' ? 'Check In' : 'Check Out'}
                </Text>
              </View>
            </View>
            
            {/* Location */}
            {item.location && item.location.latitude !== undefined && item.location.longitude !== undefined && (
              <View className="flex-row items-center" style={{ marginBottom: spacing.xs }}>
                <Ionicons name="location-outline" size={iconSize.sm} color="#6b7280" />
                <Text 
                  className="text-gray-600 ml-1"
                  style={{ fontSize: responsiveFont(12), flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
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
      className={isActive ? 'bg-primary-500' : 'bg-gray-200'}
      style={{
        paddingHorizontal: responsivePadding(18),
        paddingVertical: responsivePadding(8),
        marginRight: spacing.sm,
        borderRadius: 50,
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

  const TabButton = ({ title, value, isActive, icon }) => (
    <TouchableOpacity
      className={`flex-1 flex-row items-center justify-center ${
        isActive ? 'border-b-2 border-primary-500' : ''
      }`}
      style={{ 
        paddingVertical: spacing.md,
        minHeight: componentSize.tabBarHeight,
      }}
      onPress={() => setActiveTab(value)}
    >
      <Ionicons 
        name={icon} 
        size={isSmallScreen() ? iconSize.sm : iconSize.md} 
        color={isActive ? '#3b82f6' : '#6b7280'} 
      />
      <Text 
        className={`font-medium ${
        isActive ? 'text-primary-500' : 'text-gray-500'
        }`}
        style={{ 
          fontSize: isSmallScreen() ? responsiveFont(12) : responsiveFont(14),
          marginLeft: spacing.xs,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }} edges={['top']}>
      {/* Main Container - Welcome, Action Buttons, and Manual/Export/Clear */}
      <View 
        className="rounded-2xl shadow-sm"
        style={{ 
          backgroundColor: colors.surface,
          margin: responsivePadding(24),
          marginBottom: spacing.lg,
        }}
      >
        {/* Welcome Header */}
        <View className="flex-row items-center justify-between" style={{ padding: responsivePadding(24), paddingBottom: spacing.md }}>
          <View className="flex-row items-center flex-1" style={{ flexShrink: 1 }}>
            <Logo size="small" style={{ marginRight: spacing.md }} />
            <View className="flex-1" style={{ flexShrink: 1 }}>
              <Text 
                className="font-bold"
                style={{ 
                  color: colors.text,
                  fontSize: responsiveFont(20),
                }}
                numberOfLines={1}
              >
                Welcome, {user.username}!
              </Text>
              <View className="flex-row items-center flex-wrap">
                <Text 
                  style={{ 
                    color: colors.textSecondary,
                    fontSize: responsiveFont(12),
                  }}
                >
                  {user.role === 'super_admin' ? 'Super Admin Dashboard' : 
                   user.role === 'manager' ? `${user.department || 'Department'} Manager Dashboard` : 
                   'Admin Dashboard'}
                </Text>
                {user.role === 'manager' && user.department && (
                  <>
                    <Text 
                      style={{ 
                        color: colors.textTertiary, 
                        marginHorizontal: spacing.xs,
                        fontSize: responsiveFont(12),
                      }}
                    >
                      •
                    </Text>
                    <Text 
                      style={{ 
                        color: colors.textSecondary,
                        fontSize: responsiveFont(12),
                      }}
                    >
                      {user.department}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons - Functions */}
        <View 
          className="flex-row items-center justify-end"
          style={{ 
            paddingHorizontal: responsivePadding(24),
            paddingBottom: spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationsScreen', { user: user })}
            style={{ 
              position: 'relative',
              padding: spacing.xs,
              marginRight: spacing.sm,
            }}
          >
            <Ionicons name="notifications" size={iconSize.lg} color={colors.primary} />
            {unreadNotificationCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  minWidth: normalize(18),
                  height: normalize(18),
                  paddingHorizontal: spacing.xs / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ 
                  color: 'white', 
                  fontSize: responsiveFont(10), 
                  fontWeight: '600' 
                }}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: handleLogout },
                ]
              );
            }}
            style={{ 
              padding: spacing.xs,
              marginLeft: spacing.xs,
            }}
          >
            <Ionicons name="log-out-outline" size={iconSize.lg} color={colors.error} />
          </TouchableOpacity>
          {(user.role === 'super_admin' || user.role === 'manager') && (
            <TouchableOpacity
              onPress={() => navigation.navigate('SignupApproval', { user: user })}
              style={{ 
                position: 'relative',
                padding: spacing.xs,
                marginLeft: spacing.xs,
              }}
            >
              <Ionicons name="person-add" size={iconSize.lg} color={colors.primary} />
              {pendingSignupCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    backgroundColor: colors.error,
                    borderRadius: 10,
                    minWidth: normalize(18),
                    height: normalize(18),
                    paddingHorizontal: spacing.xs / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ 
                    color: 'white', 
                    fontSize: responsiveFont(10), 
                    fontWeight: '600' 
                  }}>
                    {pendingSignupCount > 99 ? '99+' : pendingSignupCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('ThemeSettingsScreen', { user: user })}
            style={{ padding: spacing.xs, marginLeft: spacing.xs }}
          >
            <Ionicons name="color-palette" size={iconSize.lg} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons - Manual, Export CSV, Clear All */}
        {activeTab === 'attendance' && (
          <View 
            style={{ 
              paddingHorizontal: responsivePadding(24),
              paddingBottom: responsivePadding(12),
            }}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ 
                alignItems: 'center',
                justifyContent: 'center',
              }}
              style={{ maxWidth: '100%' }}
              nestedScrollEnabled={true}
            >
              <TouchableOpacity
                className="bg-blue-500"
                onPress={() => navigation.navigate('ManualAttendance', { user: user })}
                style={{ 
                  flexShrink: 0,
                  paddingHorizontal: responsivePadding(14),
                  paddingVertical: responsivePadding(6),
                  marginRight: spacing.xs,
                  borderRadius: 50,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="create-outline" size={iconSize.sm} color="white" />
                  <Text 
                    className="text-white font-semibold"
                    style={{ 
                      fontSize: responsiveFont(13),
                      marginLeft: spacing.xs / 2,
                    }}
                  >
                    Manual
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-500"
                onPress={handleExport}
                disabled={isExporting || records.length === 0}
                style={{ 
                  flexShrink: 0,
                  paddingHorizontal: responsivePadding(14),
                  paddingVertical: responsivePadding(6),
                  marginRight: spacing.xs,
                  borderRadius: 50,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="download-outline" size={iconSize.sm} color="white" />
                  <Text 
                    className="text-white font-semibold"
                    style={{ 
                      fontSize: responsiveFont(13),
                      marginLeft: spacing.xs / 2,
                    }}
                  >
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-red-500"
                onPress={handleClearAll}
                disabled={records.length === 0}
                style={{ 
                  flexShrink: 0,
                  paddingHorizontal: responsivePadding(14),
                  paddingVertical: responsivePadding(6),
                  borderRadius: 50,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="trash-outline" size={iconSize.sm} color="white" />
                  <Text 
                    className="text-white font-semibold"
                    style={{ 
                      fontSize: responsiveFont(13),
                      marginLeft: spacing.xs / 2,
                    }}
                  >
                    Clear All
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
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
            <View 
              className="flex-row items-center bg-gray-100 rounded-xl"
              style={{
                paddingHorizontal: responsivePadding(16),
                paddingVertical: spacing.md,
                marginBottom: spacing.md,
                marginTop: spacing.xs,
              }}
            >
              <Ionicons name="search-outline" size={iconSize.md} color="#6b7280" />
              <TextInput
                className="flex-1 text-gray-800"
                placeholder="Search by username..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  fontSize: responsiveFont(14),
                  marginLeft: spacing.md,
                }}
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            {/* Filter Buttons */}
            <View 
              style={{ 
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: responsivePadding(12),
                marginHorizontal: responsivePadding(24),
                marginBottom: spacing.md,
              }}
            >
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ 
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View className="flex-row">
                  <FilterButton title="All" value="all" isActive={filter === 'all'} />
                  <FilterButton title="Check In" value="checkin" isActive={filter === 'checkin'} />
                  <FilterButton title="Check Out" value="checkout" isActive={filter === 'checkout'} />
                </View>
              </ScrollView>
            </View>
          </>
        )}

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
          <View 
            className="bg-white rounded-xl shadow-sm"
            style={{
              marginHorizontal: responsivePadding(16),
              marginVertical: spacing.md,
              padding: responsivePadding(16),
            }}
          >
            <View className="flex-row justify-around">
              <View className="items-center" style={{ flex: 1 }}>
                <Text 
                  className="font-bold text-primary-500"
                  style={{ fontSize: responsiveFont(24) }}
                >
                  {records.length}
                </Text>
                <Text 
                  className="text-gray-600"
                  style={{ 
                    fontSize: responsiveFont(12),
                    marginTop: spacing.xs / 2,
                  }}
                  numberOfLines={1}
                >
                  Total Records
                </Text>
              </View>
              <View className="items-center" style={{ flex: 1 }}>
                <Text 
                  className="font-bold text-green-500"
                  style={{ fontSize: responsiveFont(24) }}
                >
                  {records.filter(r => r.type === 'checkin').length}
                </Text>
                <Text 
                  className="text-gray-600"
                  style={{ 
                    fontSize: responsiveFont(12),
                    marginTop: spacing.xs / 2,
                  }}
                  numberOfLines={1}
                >
                  Check Ins
                </Text>
              </View>
              <View className="items-center" style={{ flex: 1 }}>
                <Text 
                  className="font-bold text-red-500"
                  style={{ fontSize: responsiveFont(24) }}
                >
                  {records.filter(r => r.type === 'checkout').length}
                </Text>
                <Text 
                  className="text-gray-600"
                  style={{ 
                    fontSize: responsiveFont(12),
                    marginTop: spacing.xs / 2,
                  }}
                  numberOfLines={1}
                >
                  Check Outs
                </Text>
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
            <View 
              className="flex-1 justify-center items-center"
              style={{ paddingHorizontal: responsivePadding(24) }}
            >
              <Ionicons name="people-outline" size={iconSize['4xl']} color="#d1d5db" />
              <Text 
                className="font-semibold text-gray-500 text-center"
                style={{ 
                  fontSize: responsiveFont(20),
                  marginTop: spacing.md,
                }}
              >
                {records.length === 0 
                  ? 'No attendance records found'
                  : 'No records match your search'
                }
              </Text>
              <Text 
                className="text-gray-400 text-center"
                style={{ 
                  fontSize: responsiveFont(14),
                  marginTop: spacing.xs,
                }}
              >
                {records.length === 0 
                  ? 'Employees need to check in to create records'
                  : 'Try adjusting your search or filter criteria'
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
          {filteredRecords.length > 0 && (
            <View 
              className="bg-white border-t border-gray-200"
              style={{ padding: responsivePadding(16) }}
            >
              <Text 
                className="text-gray-600 text-center"
                style={{ fontSize: responsiveFont(14) }}
              >
                Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Trademark */}
          <Trademark position="bottom" />
        </>
      ) : (
        <EmployeeManagement route={{ params: { user, openLeaveRequests } }} />
      )}
    </SafeAreaView>
  );
}
