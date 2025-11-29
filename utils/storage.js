// Storage utilities using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTENDANCE_RECORDS_KEY = '@attendance_records';

/**
 * Save attendance record to AsyncStorage
 * @param {Object} attendanceRecord - The attendance record to save
 */
export const saveAttendanceRecord = async (attendanceRecord) => {
  try {
    const records = await getAttendanceRecords();
    const newRecord = {
      id: Date.now().toString(),
      ...attendanceRecord,
      timestamp: attendanceRecord.timestamp || new Date().toISOString()
    };
    records.push(newRecord);
    await AsyncStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Error saving attendance record:', error);
  }
};

/**
 * Get all attendance records from AsyncStorage
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceRecords = async () => {
  try {
    const recordsJson = await AsyncStorage.getItem(ATTENDANCE_RECORDS_KEY);
    return recordsJson ? JSON.parse(recordsJson) : [];
  } catch (error) {
    console.error('Error getting attendance records:', error);
    return [];
  }
};

/**
 * Get attendance records for a specific user
 * @param {string} username - Username to filter records
 * @returns {Promise<Array>} Array of attendance records for the user
 */
export const getUserAttendanceRecords = async (username) => {
  try {
    const allRecords = await getAttendanceRecords();
    return allRecords.filter(record => 
      record.username === username || 
      record.userId === username
    );
  } catch (error) {
    console.error('Error getting user attendance records:', error);
    return [];
  }
};

/**
 * Update an attendance record
 * @param {string} recordId - Record ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateAttendanceRecord = async (recordId, updates) => {
  try {
    const records = await getAttendanceRecords();
    const recordIndex = records.findIndex(r => r.id === recordId);
    
    if (recordIndex === -1) {
      return { success: false, error: 'Record not found' };
    }
    
    records[recordIndex] = {
      ...records[recordIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: updates.updatedBy || 'system'
    };
    
    await AsyncStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
    return { success: true };
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return { success: false, error: error.message || 'Failed to update record' };
  }
};

/**
 * Delete an attendance record
 * @param {string} recordId - Record ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAttendanceRecord = async (recordId) => {
  try {
    const records = await getAttendanceRecords();
    const filteredRecords = records.filter(r => r.id !== recordId);
    
    if (filteredRecords.length === records.length) {
      return { success: false, error: 'Record not found' };
    }
    
    await AsyncStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(filteredRecords));
    return { success: true };
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return { success: false, error: error.message || 'Failed to delete record' };
  }
};

/**
 * Create a manual attendance record (for admins/managers)
 * @param {Object} attendanceData - Attendance data (username, type, timestamp, location, etc.)
 * @param {string} createdBy - Username of admin/manager creating the record
 * @returns {Promise<{success: boolean, recordId?: string, error?: string}>}
 */
export const createManualAttendanceRecord = async (attendanceData, createdBy) => {
  try {
    const records = await getAttendanceRecords();
    const newRecord = {
      id: Date.now().toString(),
      ...attendanceData,
      timestamp: attendanceData.timestamp || new Date().toISOString(),
      isManual: true,
      createdBy: createdBy,
      createdAt: new Date().toISOString()
    };
    records.push(newRecord);
    await AsyncStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
    return { success: true, recordId: newRecord.id };
  } catch (error) {
    console.error('Error creating manual attendance record:', error);
    return { success: false, error: error.message || 'Failed to create record' };
  }
};

/**
 * Clear all attendance records from AsyncStorage
 */
export const clearAllAttendanceRecords = async () => {
  try {
    await AsyncStorage.removeItem(ATTENDANCE_RECORDS_KEY);
  } catch (error) {
    console.error('Error clearing attendance records:', error);
  }
};

// Session management using AsyncStorage
const USER_SESSION_KEY = '@user_session';

export const saveUserSession = async (user) => {
  try {
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user session:', error);
  }
};

export const getUserSession = async () => {
  try {
    const sessionData = await AsyncStorage.getItem(USER_SESSION_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
};
