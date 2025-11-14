// Notification Management Utilities using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATIONS_KEY = 'app_notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }
    
    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Create and store a notification
 * @param {string} recipientUsername - Username of the notification recipient
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} type - Notification type (e.g., 'leave_request', 'leave_approved', 'leave_rejected')
 * @param {Object} data - Additional data to attach to notification
 * @returns {Promise<{success: boolean, notificationId?: string, error?: string}>}
 */
export const createNotification = async (recipientUsername, title, body, type = 'general', data = {}) => {
  try {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification = {
      id: notificationId,
      recipientUsername,
      title,
      body,
      type,
      data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Get all notifications and add new one
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    allNotifications.push(notification);

    // Keep only last 1000 notifications to prevent storage bloat
    const sortedNotifications = allNotifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    const limitedNotifications = sortedNotifications.slice(0, 1000);

    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limitedNotifications));

    // Send push notification if permissions granted
    try {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { ...data, notificationId, type },
            sound: true,
          },
          trigger: null, // Show immediately
        });
      }
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
      // Continue even if push notification fails - we still stored it
    }

    console.log(`Notification created: ${notificationId} for ${recipientUsername}`);
    return {
      success: true,
      notificationId: notificationId
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to create notification'
    };
  }
};

/**
 * Get notifications for a user
 * @param {string} username - Username to get notifications for
 * @param {boolean} unreadOnly - Whether to return only unread notifications
 * @returns {Promise<Array>} Array of notifications
 */
export const getUserNotifications = async (username, unreadOnly = false) => {
  try {
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    let userNotifications = allNotifications.filter(notif => notif.recipientUsername === username);
    
    if (unreadOnly) {
      userNotifications = userNotifications.filter(notif => !notif.read);
    }
    
    // Sort by date (newest first)
    return userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    const notificationIndex = allNotifications.findIndex(notif => notif.id === notificationId);
    if (notificationIndex === -1) {
      return {
        success: false,
        error: 'Notification not found'
      };
    }

    allNotifications[notificationIndex].read = true;
    allNotifications[notificationIndex].readAt = new Date().toISOString();

    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(allNotifications));

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark notification as read'
    };
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} username - Username
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const markAllNotificationsAsRead = async (username) => {
  try {
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    const updatedNotifications = allNotifications.map(notif => {
      if (notif.recipientUsername === username && !notif.read) {
        return {
          ...notif,
          read: true,
          readAt: new Date().toISOString()
        };
      }
      return notif;
    });

    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark all notifications as read'
    };
  }
};

/**
 * Get unread notification count for a user
 * @param {string} username - Username
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadNotificationCount = async (username) => {
  try {
    const notifications = await getUserNotifications(username, true);
    return notifications.length;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    const filteredNotifications = allNotifications.filter(notif => notif.id !== notificationId);

    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filteredNotifications));

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete notification'
    };
  }
};

/**
 * Delete all notifications for a user
 * @param {string} username - Username
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAllUserNotifications = async (username) => {
  try {
    const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
    
    const filteredNotifications = allNotifications.filter(notif => notif.recipientUsername !== username);

    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filteredNotifications));

    return { success: true };
  } catch (error) {
    console.error('Error deleting all user notifications:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete all notifications'
    };
  }
};

