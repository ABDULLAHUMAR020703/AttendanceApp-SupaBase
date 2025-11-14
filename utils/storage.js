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
