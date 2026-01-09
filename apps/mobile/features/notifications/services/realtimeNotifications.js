// Realtime Notifications Service
// Listens to Supabase notifications table for real-time updates
import { supabase } from '../../../core/config/supabase';
import { getUnreadNotificationCount } from '../../../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHANNEL_NAME = 'notifications-realtime';
const NOTIFICATIONS_KEY = 'app_notifications';

/**
 * Subscribe to notifications realtime updates
 * @param {string} recipientUid - User UID (Supabase auth.uid())
 * @param {string} recipientUsername - Username for AsyncStorage sync
 * @param {Function} onNotificationReceived - Callback when new notification arrives
 * @param {Function} onError - Error callback
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToNotifications = (recipientUid, recipientUsername, onNotificationReceived, onError) => {
  if (!recipientUid) {
    console.warn('[RealtimeNotifications] No recipientUid provided, skipping subscription');
    return { unsubscribe: () => {} };
  }

  console.log(`[RealtimeNotifications] Subscribing to notifications for user: ${recipientUsername} (${recipientUid})`);

  // Create channel
  const channel = supabase
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_uid=eq.${recipientUid}`,
      },
      async (payload) => {
        try {
          console.log('[RealtimeNotifications] New notification received:', payload.new);

          const notification = payload.new;

          // Sync to AsyncStorage for offline access
          // Convert database format to app format
          const appNotification = {
            id: notification.id, // Preserve database ID
            recipientUsername: recipientUsername,
            title: notification.title,
            body: notification.body || notification.message,
            type: notification.type || 'general',
            data: notification.data || {},
            read: notification.read || false,
            isRead: notification.read || false,
            createdAt: notification.created_at || new Date().toISOString(),
          };

          // Store in AsyncStorage directly (preserving database ID)
          try {
            const notificationsJson = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
            const allNotifications = notificationsJson ? JSON.parse(notificationsJson) : [];
            
            // Check if notification already exists (prevent duplicates)
            const exists = allNotifications.find(n => n.id === appNotification.id);
            if (!exists) {
              // Add new notification at the beginning (newest first)
              allNotifications.unshift(appNotification);
              
              // Keep only last 1000 notifications
              const sortedNotifications = allNotifications.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA;
              });
              const limitedNotifications = sortedNotifications.slice(0, 1000);
              
              await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(limitedNotifications));
              console.log('[RealtimeNotifications] ✓ Notification synced to AsyncStorage:', appNotification.id);
            } else {
              console.log('[RealtimeNotifications] Notification already exists in AsyncStorage:', appNotification.id);
            }
          } catch (storageError) {
            console.error('[RealtimeNotifications] Error syncing to AsyncStorage:', storageError);
          }

          // Update unread count
          const unreadCount = await getUnreadNotificationCount(recipientUsername);

          // Trigger callback for UI update
          if (onNotificationReceived) {
            onNotificationReceived({
              notification: appNotification,
              unreadCount,
            });
          }
        } catch (error) {
          console.error('[RealtimeNotifications] Error processing notification:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeNotifications] ✓ Successfully subscribed to notifications channel');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeNotifications] ✗ Channel error');
        if (onError) {
          onError(new Error('Channel subscription error'));
        }
      } else if (status === 'TIMED_OUT') {
        console.warn('[RealtimeNotifications] ⚠ Subscription timed out');
      } else if (status === 'CLOSED') {
        console.log('[RealtimeNotifications] Channel closed');
      }
    });

  return {
    unsubscribe: () => {
      console.log('[RealtimeNotifications] Unsubscribing from notifications channel');
      supabase.removeChannel(channel);
    },
    channel,
  };
};
