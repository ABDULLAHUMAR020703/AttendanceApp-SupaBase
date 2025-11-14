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
  const { user } = route.params;
  const { handleLogout } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'employees', 'calendar', or 'hr'
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
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Status Indicator */}
          <View style={{ marginRight: 16 }}>
            <View 
              style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 24, 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: `${getStatusColor(item.type)}20` 
              }}
            >
              <Ionicons 
                name={getStatusIcon(item.type)} 
                size={20} 
                color={getStatusColor(item.type)} 
              />
            </View>
          </View>

          {/* Record Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                {item.username}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{time}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: colors.textSecondary, marginRight: 8 }}>{date}</Text>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: item.type === 'checkin' ? colors.successLight : colors.errorLight
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: item.type === 'checkin' ? colors.success : colors.error
                }}>
                  {item.type === 'checkin' ? 'Check In' : 'Check Out'}
                </Text>
              </View>
            </View>
            
            {/* Location */}
            {item.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
                  {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Photo */}
            {item.photo && (
              <View style={{ marginTop: 8 }}>
                <Image 
                  source={{ uri: item.photo }} 
                  style={{ width: 64, height: 64, borderRadius: 8 }}
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
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: isActive ? colors.primary : colors.borderLight,
      }}
      onPress={() => setFilter(value)}
    >
      <Text style={{
        fontWeight: '500',
        color: isActive ? 'white' : colors.text
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const TabButton = ({ title, value, isActive, icon }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isActive ? 2 : 0,
        borderBottomColor: isActive ? colors.primary : 'transparent',
        minWidth: 100,
      }}
      onPress={() => setActiveTab(value)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? colors.primary : colors.textSecondary} 
      />
      <Text style={{
        marginLeft: 8,
        fontWeight: '500',
        color: isActive ? colors.primary : colors.textSecondary
      }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text 
            style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: colors.text,
              flex: 1,
              textAlign: 'left'
            }}
            numberOfLines={1}
          >
            Admin Dashboard
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingLeft: 8 }}
            style={{ flexShrink: 0 }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationsScreen', { user: user })}
              style={{ padding: 8, position: 'relative' }}
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
              style={{ padding: 8 }}
            >
              <Ionicons name="color-palette" size={24} color={colors.primary} />
            </TouchableOpacity>
            {activeTab === 'attendance' && (
              <>
                <TouchableOpacity
                  style={{ backgroundColor: colors.success, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  onPress={handleExport}
                  disabled={isExporting || records.length === 0}
                >
                  <Ionicons name="download-outline" size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{ backgroundColor: colors.error, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                  onPress={handleClearAll}
                  disabled={records.length === 0}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Clear All</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <View style={{ flexDirection: 'row' }}>
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
        </ScrollView>

        {/* Search Bar - Only for Attendance Tab */}
        {activeTab === 'attendance' && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={{ flex: 1, marginLeft: 12, color: colors.text }}
                placeholder="Search by username..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {/* Filter Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
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
          <View style={{ backgroundColor: colors.surface, marginHorizontal: 16, marginVertical: 16, borderRadius: 12, padding: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary }}>{records.length}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Total Records</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.success }}>
                  {records.filter(r => r.type === 'checkin').length}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Check Ins</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.error }}>
                  {records.filter(r => r.type === 'checkout').length}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Check Outs</Text>
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
              <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
              <Text style={{ fontSize: 20, fontWeight: '600', color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
                {records.length === 0 
                  ? 'No attendance records found'
                  : 'No records match your search'
                }
              </Text>
              <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 8 }}>
                {records.length === 0 
                  ? 'Employees need to check in to create records'
                  : 'Try adjusting your search or filter criteria'
                }
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 }}
                onPress={onRefresh}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary */}
          {filteredRecords.length > 0 && (
            <View style={{ backgroundColor: colors.surface, padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                Showing {filteredRecords.length} of {records.length} record{records.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </>
      ) : (
        <EmployeeManagement route={{ params: { user } }} />
      )}
    </View>
  );
}
