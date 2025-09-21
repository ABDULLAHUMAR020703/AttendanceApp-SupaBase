import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTENDANCE_KEY = 'attendance_records';
const USER_SESSION_KEY = 'user_session';

/**
 * Save attendance record to AsyncStorage
 * @param {Object} attendanceRecord - The attendance record to save
 */
export const saveAttendanceRecord = async (attendanceRecord) => {
  try {
    const existingRecords = await getAttendanceRecords();
    const updatedRecords = [...existingRecords, attendanceRecord];
    await AsyncStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));
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
    const records = await AsyncStorage.getItem(ATTENDANCE_KEY);
    return records ? JSON.parse(records) : [];
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
    return allRecords.filter(record => record.username === username);
  } catch (error) {
    console.error('Error getting user attendance records:', error);
    return [];
  }
};

/**
 * Save user session to AsyncStorage
 * @param {Object} user - User object with username and role
 */
export const saveUserSession = async (user) => {
  try {
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user session:', error);
  }
};

/**
 * Get user session from AsyncStorage
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserSession = async () => {
  try {
    const session = await AsyncStorage.getItem(USER_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
};

/**
 * Clear user session from AsyncStorage
 */
export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem(USER_SESSION_KEY);
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
};

/**
 * Clear all attendance records
 */
export const clearAllAttendanceRecords = async () => {
  try {
    await AsyncStorage.removeItem(ATTENDANCE_KEY);
  } catch (error) {
    console.error('Error clearing attendance records:', error);
  }
};
