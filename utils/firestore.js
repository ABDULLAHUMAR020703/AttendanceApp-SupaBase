// Firestore Database Utilities
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Collection names
const COLLECTIONS = {
  ATTENDANCE: 'attendance',
  EMPLOYEES: 'employees',
  USERS: 'users'
};

/**
 * Save attendance record to Firestore
 * @param {Object} attendanceRecord - The attendance record to save
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const saveAttendanceRecord = async (attendanceRecord) => {
  try {
    const recordData = {
      ...attendanceRecord,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE), recordData);
    
    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error saving attendance record:', error);
    return {
      success: false,
      error: error.message || 'Failed to save attendance record'
    };
  }
};

/**
 * Get all attendance records from Firestore
 * @param {number} limitCount - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceRecords = async (limitCount = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      orderBy('timestamp', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || data.createdAt
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error getting attendance records:', error);
    return [];
  }
};

/**
 * Get attendance records for a specific user
 * @param {string} userId - User ID (uid) to filter records
 * @param {number} limitCount - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of attendance records for the user
 */
export const getUserAttendanceRecords = async (userId, limitCount = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || data.createdAt
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error getting user attendance records:', error);
    return [];
  }
};

/**
 * Get attendance records by type (checkin/checkout)
 * @param {string} type - Record type ('checkin' or 'checkout')
 * @param {number} limitCount - Maximum number of records to retrieve
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceRecordsByType = async (type, limitCount = null) => {
  try {
    let q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('type', '==', type),
      orderBy('timestamp', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const records = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp || data.createdAt
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error getting attendance records by type:', error);
    return [];
  }
};

/**
 * Delete attendance record
 * @param {string} recordId - Record ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAttendanceRecord = async (recordId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, recordId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete attendance record'
    };
  }
};

/**
 * Clear all attendance records (Admin only)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const clearAllAttendanceRecords = async () => {
  try {
    const records = await getAttendanceRecords();
    const deletePromises = records.map(record => 
      deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id))
    );
    await Promise.all(deletePromises);
    return { success: true };
  } catch (error) {
    console.error('Error clearing attendance records:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear attendance records'
    };
  }
};

/**
 * Get employee by ID
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object|null>} Employee object or null
 */
export const getEmployee = async (employeeId) => {
  try {
    const docRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting employee:', error);
    return null;
  }
};

/**
 * Get all employees
 * @returns {Promise<Array>} Array of employee objects
 */
export const getEmployees = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
    const employees = [];
    
    querySnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return employees;
  } catch (error) {
    console.error('Error getting employees:', error);
    return [];
  }
};

/**
 * Create or update employee
 * @param {string} employeeId - Employee ID (use userId for new employees)
 * @param {Object} employeeData - Employee data
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const saveEmployee = async (employeeId, employeeData) => {
  try {
    const employeeRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
    await setDoc(employeeRef, {
      ...employeeData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return {
      success: true,
      id: employeeId
    };
  } catch (error) {
    console.error('Error saving employee:', error);
    return {
      success: false,
      error: error.message || 'Failed to save employee'
    };
  }
};

/**
 * Update employee
 * @param {string} employeeId - Employee ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateEmployee = async (employeeId, updates) => {
  try {
    const employeeRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
    await updateDoc(employeeRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating employee:', error);
    return {
      success: false,
      error: error.message || 'Failed to update employee'
    };
  }
};

/**
 * Get user document from Firestore
 * @param {string} userId - User ID (uid)
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserData = async (userId) => {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

