// Realtime Attendance Service
// Listens to Supabase attendance_records table for real-time updates
import { supabase } from '../../../core/config/supabase';

const CHANNEL_NAME = 'attendance-realtime';

/**
 * Convert database attendance record format to app format
 * @param {Object} dbRecord - Record from database
 * @returns {Object} Record in app format
 */
const convertAttendanceFromDb = (dbRecord) => {
  return {
    id: dbRecord.id,
    username: dbRecord.username,
    employeeName: dbRecord.employee_name,
    type: dbRecord.type,
    timestamp: dbRecord.timestamp,
    location: dbRecord.location,
    photo: dbRecord.photo,
    authMethod: dbRecord.auth_method,
    isManual: dbRecord.is_manual || false,
    createdBy: dbRecord.created_by,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    updatedBy: dbRecord.updated_by,
    userUid: dbRecord.user_uid,
  };
};

/**
 * Subscribe to attendance records realtime updates
 * @param {Object} user - Current user object with uid, username, role, department
 * @param {Function} onAttendanceChange - Callback when attendance record changes
 * @param {Function} onError - Error callback
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToAttendance = (user, onAttendanceChange, onError) => {
  if (!user || !user.uid) {
    console.warn('[RealtimeAttendance] No user provided, skipping subscription');
    return { unsubscribe: () => {} };
  }

  console.log(`[RealtimeAttendance] Subscribing to attendance for user: ${user.username} (role: ${user.role})`);

  // Determine filter based on user role
  let filter;
  if (user.role === 'super_admin') {
    // Super admins see all attendance records
    filter = null; // No filter = all records
  } else if (user.role === 'manager') {
    // Managers see department attendance records
    // Note: RLS policies handle department filtering, but we can add client-side filter for efficiency
    // For now, we'll rely on RLS and listen to all changes (RLS will filter)
    filter = null;
  } else {
    // Employees see only their own records
    filter = `user_uid=eq.${user.uid}`;
  }

  // Create channel for INSERT events
  const insertChannel = supabase
    .channel(`${CHANNEL_NAME}-insert`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_records',
        filter: filter,
      },
      (payload) => {
        try {
          console.log('[RealtimeAttendance] New attendance record:', payload.new);
          const attendanceRecord = convertAttendanceFromDb(payload.new);

          // Check if this record is relevant to the user
          const isRelevant =
            user.role === 'super_admin' ||
            user.role === 'manager' ||
            attendanceRecord.userUid === user.uid;

          if (isRelevant && onAttendanceChange) {
            onAttendanceChange({
              type: 'INSERT',
              record: attendanceRecord,
            });
          }
        } catch (error) {
          console.error('[RealtimeAttendance] Error processing INSERT:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeAttendance] ✓ Successfully subscribed to INSERT events');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeAttendance] ✗ INSERT channel error');
        if (onError) {
          onError(new Error('INSERT channel subscription error'));
        }
      }
    });

  // Create channel for UPDATE events
  const updateChannel = supabase
    .channel(`${CHANNEL_NAME}-update`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'attendance_records',
        filter: filter,
      },
      (payload) => {
        try {
          console.log('[RealtimeAttendance] Attendance record updated:', payload.new);
          const attendanceRecord = convertAttendanceFromDb(payload.new);

          // Check if this record is relevant to the user
          const isRelevant =
            user.role === 'super_admin' ||
            user.role === 'manager' ||
            attendanceRecord.userUid === user.uid;

          if (isRelevant && onAttendanceChange) {
            onAttendanceChange({
              type: 'UPDATE',
              record: attendanceRecord,
              oldRecord: payload.old ? convertAttendanceFromDb(payload.old) : null,
            });
          }
        } catch (error) {
          console.error('[RealtimeAttendance] Error processing UPDATE:', error);
          if (onError) {
            onError(error);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[RealtimeAttendance] ✓ Successfully subscribed to UPDATE events');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[RealtimeAttendance] ✗ UPDATE channel error');
        if (onError) {
          onError(new Error('UPDATE channel subscription error'));
        }
      }
    });

  return {
    unsubscribe: () => {
      console.log('[RealtimeAttendance] Unsubscribing from attendance channels');
      supabase.removeChannel(insertChannel);
      supabase.removeChannel(updateChannel);
    },
    insertChannel,
    updateChannel,
  };
};
