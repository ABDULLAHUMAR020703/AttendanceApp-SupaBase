// Realtime Employees/Work Mode Service
// Listens to Supabase users table for work_mode changes
import { supabase } from '../../../core/config/supabase';

const CHANNEL_NAME = 'workmode-realtime';

/**
 * Subscribe to work mode changes realtime updates
 * @param {Object} user - Current user object with uid, role, department
 * @param {Function} onWorkModeChange - Callback when work_mode changes
 * @param {Function} onError - Error callback
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToWorkModeChanges = (user, onWorkModeChange, onError) => {
  if (!user) {
    console.warn('[RealtimeEmployees] No user provided, skipping subscription');
    return { unsubscribe: () => {} };
  }

  console.log(`[RealtimeEmployees] Subscribing to work mode changes (user role: ${user.role})`);

  // Determine filter based on user role
  // Managers and HR need to see department changes, super admins see all
  let filter = null; // Default: no filter (RLS will handle permissions)

  // For employees, we could filter to their own record, but they might want to see
  // department changes too. Let RLS handle it.
  // If needed, we can add: filter = `uid=eq.${user.uid}` for employees only

  // Create channel for UPDATE events on users table
  // We specifically listen for work_mode changes
  const channel = supabase
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: filter,
      },
      (payload) => {
        try {
          const oldWorkMode = payload.old?.work_mode;
          const newWorkMode = payload.new?.work_mode;

          // Only trigger callback if work_mode actually changed
          if (oldWorkMode !== newWorkMode) {
            console.log('[RealtimeEmployees] Work mode changed:', {
              uid: payload.new.uid,
              username: payload.new.username,
              oldWorkMode,
              newWorkMode,
            });

            // Check if this change is relevant to the user
            const isRelevant =
              user.role === 'super_admin' ||
              (user.role === 'manager' && payload.new.department === user.department) ||
              payload.new.uid === user.uid;

            if (isRelevant && onWorkModeChange) {
              onWorkModeChange({
                uid: payload.new.uid,
                username: payload.new.username,
                oldWorkMode,
                newWorkMode,
                employee: {
                  uid: payload.new.uid,
                  username: payload.new.username,
                  name: payload.new.name,
                  email: payload.new.email,
                  role: payload.new.role,
                  department: payload.new.department,
                  position: payload.new.position,
                  workMode: payload.new.work_mode,
                  isActive: payload.new.is_active,
                },
              });
            }
          }
        } catch (error) {
          console.error('[RealtimeEmployees] Error processing work mode change:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeEmployees] ✓ Successfully subscribed to work mode changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeEmployees] ✗ Channel error');
        if (onError) {
          onError(new Error('Channel subscription error'));
        }
      } else if (status === 'TIMED_OUT') {
        console.warn('[RealtimeEmployees] ⚠ Subscription timed out');
      } else if (status === 'CLOSED') {
        console.log('[RealtimeEmployees] Channel closed');
      }
    });

  return {
    unsubscribe: () => {
      console.log('[RealtimeEmployees] Unsubscribing from work mode changes channel');
      supabase.removeChannel(channel);
    },
    channel,
  };
};
