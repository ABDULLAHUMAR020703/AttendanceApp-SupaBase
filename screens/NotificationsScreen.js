import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllUserNotifications,
  getUnreadNotificationCount
} from '../utils/notifications';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationsScreen({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    loadNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotifications();
    });
    return unsubscribe;
  }, [navigation, filter]);

  const loadNotifications = async () => {
    try {
      const allNotifications = await getUserNotifications(user.username);
      const unread = await getUnreadNotificationCount(user.username);
      setUnreadCount(unread);
      
      // Apply filter
      let filtered = allNotifications;
      if (filter === 'unread') {
        filtered = allNotifications.filter(n => !n.read);
      } else if (filter === 'read') {
        filtered = allNotifications.filter(n => n.read);
      }
      
      setNotifications(filtered);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(user.username);
      await loadNotifications();
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllUserNotifications(user.username);
              await loadNotifications();
              Alert.alert('Success', 'All notifications deleted');
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              Alert.alert('Error', 'Failed to delete all notifications');
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'leave_request':
        return 'calendar-outline';
      case 'leave_approved':
        return 'checkmark-circle';
      case 'leave_rejected':
        return 'close-circle';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'leave_request':
        return colors.primary;
      case 'leave_approved':
        return colors.success;
      case 'leave_rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type and data
    // Check if navigation data exists in notification.data
    const navData = notification.data?.navigation;
    
    if (navData) {
      const { screen, params } = navData;
      
      try {
        // Navigate to the specified screen
        navigation.navigate(screen, params);
        return;
      } catch (error) {
        console.error('Error navigating from notification:', error);
        // Fall through to fallback navigation
      }
    }
    
    // Fallback navigation based on notification type
    switch (notification.type) {
      case 'leave_request':
        // For admins, navigate to EmployeeManagement
        if (user.role === 'admin') {
          navigation.navigate('AdminDashboard', {
            user: user,
            initialTab: 'employees',
            openLeaveRequests: true
          });
        }
        break;
      case 'ticket_created':
      case 'ticket_assigned':
        // For admins, navigate to TicketManagement
        if (user.role === 'admin') {
          navigation.navigate('TicketManagement', {
            user: user,
            ticketId: notification.data?.ticketId
          });
        }
        break;
      case 'leave_approved':
      case 'leave_rejected':
        // For employees, navigate to LeaveRequestScreen
        if (user.role === 'employee') {
          navigation.navigate('LeaveRequestScreen', {
            user: user
          });
        }
        break;
      case 'ticket_updated':
      case 'ticket_response':
        // Navigate to TicketScreen for employees, TicketManagement for admins
        if (user.role === 'employee') {
          navigation.navigate('TicketScreen', {
            user: user,
            ticketId: notification.data?.ticketId
          });
        } else if (user.role === 'admin') {
          navigation.navigate('TicketManagement', {
            user: user,
            ticketId: notification.data?.ticketId
          });
        }
        break;
      default:
        // No navigation for other types
        break;
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: item.read ? colors.surface : colors.primaryLight + '20',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: getNotificationColor(item.type),
      }}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: getNotificationColor(item.type) + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: item.read ? '400' : '600', color: colors.text, flex: 1 }}>
              {item.title}
            </Text>
            {!item.read && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                  marginLeft: 8,
                }}
              />
            )}
          </View>
          
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
            {item.body}
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {formatDate(item.createdAt)}
            </Text>
            
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 8, marginRight: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={{ padding: 8 }}
              >
                <Ionicons name="checkmark-done" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleDeleteAll}
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {['all', 'unread', 'read'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setFilter(filterType)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: filter === filterType ? colors.primary : colors.background,
              }}
            >
              <Text
                style={{
                  color: filter === filterType ? 'white' : colors.textSecondary,
                  fontWeight: filter === filterType ? '600' : '400',
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}
              >
                {filterType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
            No notifications
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            {filter === 'unread' 
              ? 'You have no unread notifications'
              : filter === 'read'
              ? 'You have no read notifications'
              : 'You don\'t have any notifications yet'}
          </Text>
        </View>
      )}
    </View>
  );
}

