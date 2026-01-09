# Supabase Realtime Implementation

This document describes the realtime subscription implementation for the Attendance App mobile frontend.

## Overview

The app now uses Supabase Realtime to receive live updates for:
1. **Notifications** - Instant notification delivery
2. **Attendance Records** - Real-time attendance updates
3. **Work Mode Changes** - Live work mode updates

## Architecture

### Feature-Based Structure

Realtime services are organized by feature:

```
apps/mobile/features/
├── notifications/
│   └── services/
│       └── realtimeNotifications.js
├── attendance/
│   └── services/
│       └── realtimeAttendance.js
└── employees/
    └── services/
        └── realtimeEmployees.js
```

### Subscription Lifecycle

All realtime subscriptions are managed in `AuthContext`:

- **Created**: When user logs in (after `user` state is set)
- **Destroyed**: When user logs out or component unmounts
- **Cleanup**: Uses `supabase.removeChannel()` to prevent memory leaks

## Implementation Details

### 1. Notifications Realtime (`realtimeNotifications.js`)

**Channel**: `notifications-realtime`

**Listens to**:
- `INSERT` events on `public.notifications` table
- Filtered by `recipient_uid=eq.{user.uid}`

**Behavior**:
- Receives new notifications instantly
- Syncs to AsyncStorage for offline access
- Updates unread count automatically
- Triggers UI refresh callbacks

**Database Table Requirements**:
The `public.notifications` table must have:
- `id` (UUID)
- `recipient_uid` (UUID) - Supabase Auth UID
- `title` (TEXT)
- `body` or `message` (TEXT)
- `type` (VARCHAR)
- `data` (JSONB, optional)
- `read` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

### 2. Attendance Realtime (`realtimeAttendance.js`)

**Channel**: `attendance-realtime-insert`, `attendance-realtime-update`

**Listens to**:
- `INSERT` events on `public.attendance_records` table
- `UPDATE` events on `public.attendance_records` table

**Filtering by Role**:
- **Super Admin**: All records (no filter, RLS handles permissions)
- **Manager**: Department records (RLS handles department filtering)
- **Employee**: Own records only (`user_uid=eq.{user.uid}`)

**Behavior**:
- Receives new attendance records instantly
- Receives updates to existing records
- Triggers dashboard refresh callbacks

### 3. Work Mode Realtime (`realtimeEmployees.js`)

**Channel**: `workmode-realtime`

**Listens to**:
- `UPDATE` events on `public.users` table
- Only triggers when `work_mode` field changes

**Filtering by Role**:
- **Super Admin**: All users (no filter)
- **Manager**: Department users (RLS handles filtering)
- **Employee**: Own record (RLS handles permissions)

**Behavior**:
- Detects work mode changes instantly
- Updates employee cache automatically
- Refreshes HR/Manager dashboards
- Updates work mode distribution stats

## Integration in AuthContext

The `AuthContext` component manages all subscriptions:

```javascript
// Subscriptions are created when user logs in
useEffect(() => {
  if (!user || !user.uid) {
    // Clean up subscriptions if user logs out
    return;
  }
  
  // Set up all three subscriptions
  // Cleanup function removes all subscriptions
}, [user]);
```

**Key Features**:
- No duplicate subscriptions (checked before creating)
- Proper cleanup on logout
- Error handling for each subscription
- Logging for debugging

## Usage

### In Components

The realtime subscriptions run automatically when a user is logged in. Components can listen to changes by:

1. **Notifications**: Check AsyncStorage or use notification utilities
2. **Attendance**: Refresh attendance data when callbacks trigger
3. **Work Mode**: Refresh employee lists when work mode changes

### Example: Listening to Changes

```javascript
// In a component that needs to react to realtime updates
import { useAuth } from '../core/contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();
  
  // The realtime subscriptions are already active
  // Just refresh your data when needed
  useEffect(() => {
    loadData(); // Your data loading function
  }, [user]); // Re-run when user changes
}
```

## Channel Naming

All channels use clear, stable names:
- `notifications-realtime`
- `attendance-realtime-insert`
- `attendance-realtime-update`
- `workmode-realtime`

## Safety Rules

✅ **DO**:
- Create subscriptions in AuthContext (after login)
- Destroy subscriptions on logout
- Use `supabase.removeChannel()` for cleanup
- Filter by user role appropriately
- Handle errors gracefully

❌ **DON'T**:
- Create subscriptions inside screens/components
- Create duplicate channels
- Leave channels active after logout
- Listen to SELECT events (only INSERT/UPDATE)
- Store realtime state globally

## Database Setup

### Notifications Table

If the `public.notifications` table doesn't exist, create it:

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_uid UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient_uid ON notifications(recipient_uid);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (recipient_uid = auth.uid());
```

### Enable Realtime

Enable Realtime for the tables:

```sql
-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable Realtime for attendance_records (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Enable Realtime for users (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

## Testing

1. **Notifications**:
   - Insert a notification in Supabase dashboard
   - Verify it appears in the app instantly
   - Check AsyncStorage for persistence

2. **Attendance**:
   - Create an attendance record
   - Verify dashboards update automatically
   - Check that employees only see their own records

3. **Work Mode**:
   - Update a user's work_mode in Supabase
   - Verify HR/Manager dashboards refresh
   - Check work mode distribution stats update

## Troubleshooting

### Subscriptions Not Working

1. Check Supabase Realtime is enabled for the tables
2. Verify RLS policies allow the user to see the data
3. Check browser console for subscription errors
4. Verify user is logged in (subscriptions only work when authenticated)

### Memory Leaks

- Ensure `unsubscribe()` is called on logout
- Check that cleanup functions run in useEffect
- Verify no duplicate subscriptions are created

### Performance

- Realtime subscriptions are lightweight
- RLS policies filter data server-side
- Only relevant changes trigger callbacks

## Future Enhancements

Potential improvements:
- Add DELETE event listeners for attendance records
- Add notification UPDATE listener for read status sync
- Add connection status monitoring
- Add retry logic for failed subscriptions
