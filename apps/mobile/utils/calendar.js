// Calendar and Events Management Utilities using Supabase (with AsyncStorage fallback)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../core/config/supabase';

const CALENDAR_EVENTS_KEY = 'calendar_events'; // For fallback only

/**
 * Convert database calendar event format to app format
 * @param {Object} dbEvent - Event from database
 * @returns {Object} Event in app format
 */
const convertCalendarEventFromDb = (dbEvent) => {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description || '',
    date: dbEvent.date,
    time: dbEvent.time || '',
    type: dbEvent.type,
    color: dbEvent.color || '#3b82f6',
    createdBy: dbEvent.created_by,
    createdByUid: dbEvent.created_by_uid,
    assignedTo: dbEvent.assigned_to || [],
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at
  };
};

/**
 * Create a calendar event (meeting, reminder, etc.)
 * @param {Object} eventData - Event data
 * @param {string} eventData.title - Event title
 * @param {string} eventData.description - Event description (optional)
 * @param {string} eventData.date - Event date (YYYY-MM-DD)
 * @param {string} eventData.time - Event time (HH:MM) (optional)
 * @param {string} eventData.type - Event type: 'meeting', 'reminder', 'holiday', 'other'
 * @param {string} eventData.createdBy - Username who created the event
 * @param {Array<string>} eventData.assignedTo - Array of employee IDs/usernames (empty = all employees)
 * @param {string} eventData.color - Event color (optional)
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
export const createCalendarEvent = async (eventData) => {
  try {
    const {
      title,
      description = '',
      date,
      time = '',
      type = 'other',
      createdBy,
      assignedTo = [], // Empty array means visible to all
      color = '#3b82f6'
    } = eventData;

    // Validate required fields
    if (!title || !date || !createdBy) {
      return {
        success: false,
        error: 'Title, date, and creator are required'
      };
    }

    // Validate date format
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      };
    }

    // Validate event type
    const validTypes = ['meeting', 'reminder', 'holiday', 'other'];
    if (!validTypes.includes(type)) {
      return {
        success: false,
        error: 'Invalid event type. Must be: meeting, reminder, holiday, or other'
      };
    }

    // Get user UID from current Supabase session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    const createdByUid = authUser?.id || null;

    // Create event in Supabase
    const eventDataDb = {
      title,
      description: description || null,
      date,
      time: time || null,
      type,
      color,
      created_by: createdBy,
      created_by_uid: createdByUid,
      assigned_to: assignedTo.length > 0 ? assignedTo : [] // Empty array = visible to all
    };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert(eventDataDb)
      .select()
      .single();

    if (error) {
      console.error('Error creating calendar event in Supabase:', error);
      // Fallback to AsyncStorage
      return await createCalendarEventFallback(eventData);
    }

    console.log('✓ Calendar event created in Supabase:', data.id);
    return {
      success: true,
      eventId: data.id
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    // Fallback to AsyncStorage
    return await createCalendarEventFallback(eventData);
  }
};

/**
 * Fallback: Create calendar event in AsyncStorage
 */
const createCalendarEventFallback = async (eventData) => {
  try {
    const {
      title,
      description = '',
      date,
      time = '',
      type = 'other',
      createdBy,
      assignedTo = [],
      color = '#3b82f6'
    } = eventData;

    const eventId = `event_${Date.now()}_${createdBy}`;
    const event = {
      id: eventId,
      title,
      description,
      date,
      time,
      type,
      createdBy,
      assignedTo,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const eventsJson = await AsyncStorage.getItem(CALENDAR_EVENTS_KEY);
    const allEvents = eventsJson ? JSON.parse(eventsJson) : [];
    allEvents.push(event);

    await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(allEvents));

    console.log('⚠️ Calendar event created in AsyncStorage (fallback):', eventId);
    return {
      success: true,
      eventId: eventId
    };
  } catch (error) {
    console.error('Error creating calendar event in AsyncStorage:', error);
    return {
      success: false,
      error: error.message || 'Failed to create calendar event'
    };
  }
};

/**
 * Get all calendar events for a user
 * @param {string} employeeId - Employee ID or username
 * @param {string} startDate - Start date filter (YYYY-MM-DD) (optional)
 * @param {string} endDate - End date filter (YYYY-MM-DD) (optional)
 * @returns {Promise<Array>} Array of calendar events
 */
export const getCalendarEvents = async (employeeId = null, startDate = null, endDate = null) => {
  try {
    // Get current user info for RLS filtering
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const currentUsername = employeeId || authUser?.user_metadata?.username || null;

    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    // Apply date filters
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting calendar events from Supabase:', error);
      // Fallback to AsyncStorage
      return await getCalendarEventsFallback(employeeId, startDate, endDate);
    }

    // Convert to app format
    let events = data.map(convertCalendarEventFromDb);

    // Filter by employee if provided (RLS handles most of this, but we filter assignedTo here)
    if (currentUsername) {
      events = events.filter(event => {
        // Show event if:
        // 1. Assigned to all (empty assignedTo array)
        // 2. Assigned to this employee specifically
        // 3. Created by this employee
        return (
          (!event.assignedTo || event.assignedTo.length === 0) ||
          event.assignedTo.includes(currentUsername) ||
          event.assignedTo.includes(employeeId) ||
          event.createdBy === currentUsername ||
          event.createdBy === employeeId
        );
      });
    }

    return events;
  } catch (error) {
    console.error('Error getting calendar events:', error);
    // Fallback to AsyncStorage
    return await getCalendarEventsFallback(employeeId, startDate, endDate);
  }
};

/**
 * Fallback: Get calendar events from AsyncStorage
 */
const getCalendarEventsFallback = async (employeeId = null, startDate = null, endDate = null) => {
  try {
    const eventsJson = await AsyncStorage.getItem(CALENDAR_EVENTS_KEY);
    const allEvents = eventsJson ? JSON.parse(eventsJson) : [];

    let filteredEvents = allEvents;
    
    if (employeeId) {
      filteredEvents = allEvents.filter(event => {
        return (
          (!event.assignedTo || event.assignedTo.length === 0) ||
          event.assignedTo.includes(employeeId) ||
          event.createdBy === employeeId
        );
      });
    }

    if (startDate || endDate) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = event.date;
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        return true;
      });
    }

    filteredEvents.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });

    return filteredEvents;
  } catch (error) {
    console.error('Error getting calendar events from AsyncStorage:', error);
    return [];
  }
};

/**
 * Get events for a specific date
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} employeeId - Employee ID or username (optional)
 * @returns {Promise<Array>} Array of events for that date
 */
export const getEventsByDate = async (date, employeeId = null) => {
  try {
    const allEvents = await getCalendarEvents(employeeId);
    return allEvents.filter(event => event.date === date);
  } catch (error) {
    console.error('Error getting events by date:', error);
    return [];
  }
};

/**
 * Update a calendar event
 * @param {string} eventId - Event ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateCalendarEvent = async (eventId, updates) => {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Convert app format to db format
    if (updates.createdBy) updateData.created_by = updates.createdBy;
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
    if (updates.createdAt) updateData.created_at = updates.createdAt;
    
    // Remove app-format fields
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const { error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Error updating calendar event in Supabase:', error);
      // Fallback to AsyncStorage
      return await updateCalendarEventFallback(eventId, updates);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    // Fallback to AsyncStorage
    return await updateCalendarEventFallback(eventId, updates);
  }
};

/**
 * Fallback: Update calendar event in AsyncStorage
 */
const updateCalendarEventFallback = async (eventId, updates) => {
  try {
    const eventsJson = await AsyncStorage.getItem(CALENDAR_EVENTS_KEY);
    const allEvents = eventsJson ? JSON.parse(eventsJson) : [];

    const eventIndex = allEvents.findIndex(event => event.id === eventId);
    if (eventIndex === -1) {
      return {
        success: false,
        error: 'Event not found'
      };
    }

    allEvents[eventIndex] = {
      ...allEvents[eventIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(allEvents));

    return { success: true };
  } catch (error) {
    console.error('Error updating calendar event in AsyncStorage:', error);
    return {
      success: false,
      error: error.message || 'Failed to update calendar event'
    };
  }
};

/**
 * Delete a calendar event
 * @param {string} eventId - Event ID
 * @param {string} deletedBy - Username who deleted (for logging)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteCalendarEvent = async (eventId, deletedBy) => {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting calendar event from Supabase:', error);
      // Fallback to AsyncStorage
      return await deleteCalendarEventFallback(eventId, deletedBy);
    }

    console.log(`✓ Calendar event deleted from Supabase: ${eventId} by ${deletedBy}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    // Fallback to AsyncStorage
    return await deleteCalendarEventFallback(eventId, deletedBy);
  }
};

/**
 * Fallback: Delete calendar event from AsyncStorage
 */
const deleteCalendarEventFallback = async (eventId, deletedBy) => {
  try {
    const eventsJson = await AsyncStorage.getItem(CALENDAR_EVENTS_KEY);
    const allEvents = eventsJson ? JSON.parse(eventsJson) : [];

    const eventIndex = allEvents.findIndex(event => event.id === eventId);
    if (eventIndex === -1) {
      return {
        success: false,
        error: 'Event not found'
      };
    }

    allEvents.splice(eventIndex, 1);

    await AsyncStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(allEvents));

    console.log(`⚠️ Calendar event deleted from AsyncStorage (fallback): ${eventId} by ${deletedBy}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event from AsyncStorage:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete calendar event'
    };
  }
};

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} Event object or null
 */
export const getEventById = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error getting event by ID from Supabase:', error);
      // Fallback to AsyncStorage
      return await getEventByIdFallback(eventId);
    }

    return data ? convertCalendarEventFromDb(data) : null;
  } catch (error) {
    console.error('Error getting event by ID:', error);
    // Fallback to AsyncStorage
    return await getEventByIdFallback(eventId);
  }
};

/**
 * Fallback: Get event by ID from AsyncStorage
 */
const getEventByIdFallback = async (eventId) => {
  try {
    const eventsJson = await AsyncStorage.getItem(CALENDAR_EVENTS_KEY);
    const allEvents = eventsJson ? JSON.parse(eventsJson) : [];

    return allEvents.find(event => event.id === eventId) || null;
  } catch (error) {
    console.error('Error getting event by ID from AsyncStorage:', error);
    return null;
  }
};

/**
 * Get events grouped by date
 * @param {string} employeeId - Employee ID or username (optional)
 * @param {string} startDate - Start date (YYYY-MM-DD) (optional)
 * @param {string} endDate - End date (YYYY-MM-DD) (optional)
 * @returns {Promise<Object>} Object with dates as keys and arrays of events as values
 */
export const getEventsGroupedByDate = async (employeeId = null, startDate = null, endDate = null) => {
  try {
    const events = await getCalendarEvents(employeeId, startDate, endDate);
    const grouped = {};

    events.forEach(event => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });

    return grouped;
  } catch (error) {
    console.error('Error getting events grouped by date:', error);
    return {};
  }
};

/**
 * Get event type color
 * @param {string} type - Event type
 * @returns {string} Color hex code
 */
export const getEventTypeColor = (type) => {
  const colors = {
    meeting: '#3b82f6', // blue
    reminder: '#f59e0b', // amber
    holiday: '#10b981', // green
    other: '#6b7280' // gray
  };
  return colors[type] || colors.other;
};

/**
 * Get event type icon
 * @param {string} type - Event type
 * @returns {string} Icon name
 */
export const getEventTypeIcon = (type) => {
  const icons = {
    meeting: 'people',
    reminder: 'notifications',
    holiday: 'calendar',
    other: 'calendar-outline'
  };
  return icons[type] || icons.other;
};

/**
 * Get event type label
 * @param {string} type - Event type
 * @returns {string} Human-readable label
 */
export const getEventTypeLabel = (type) => {
  const labels = {
    meeting: 'Meeting',
    reminder: 'Reminder',
    holiday: 'Holiday',
    other: 'Event'
  };
  return labels[type] || labels.other;
};
