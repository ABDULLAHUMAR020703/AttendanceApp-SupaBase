// Leave Management Utilities using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNotification } from './notifications';
import { getEmployeeById, getAdminUsers, getSuperAdminUsers, getManagersByDepartment } from './employees';

const LEAVE_SETTINGS_KEY = 'leave_settings';
const EMPLOYEE_LEAVES_KEY = 'employee_leaves';
const LEAVE_REQUESTS_KEY = 'leave_requests';

/**
 * Get default leave settings
 * @returns {Promise<Object>} Default leave settings
 */
export const getDefaultLeaveSettings = async () => {
  try {
    const settingsJson = await AsyncStorage.getItem(LEAVE_SETTINGS_KEY);
    
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    
    // Return default values if not set
    return {
      defaultAnnualLeaves: 20,
      defaultSickLeaves: 10,
      defaultCasualLeaves: 5,
      leaveYearStart: '01-01', // MM-DD format
      leaveYearEnd: '12-31',
      updatedAt: null
    };
  } catch (error) {
    console.error('Error getting default leave settings:', error);
    return {
      defaultAnnualLeaves: 20,
      defaultSickLeaves: 10,
      defaultCasualLeaves: 5,
      leaveYearStart: '01-01',
      leaveYearEnd: '12-31'
    };
  }
};

/**
 * Update default leave settings
 * @param {Object} settings - Leave settings object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateDefaultLeaveSettings = async (settings) => {
  try {
    const settingsData = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    
    await AsyncStorage.setItem(LEAVE_SETTINGS_KEY, JSON.stringify(settingsData));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating default leave settings:', error);
    return {
      success: false,
      error: error.message || 'Failed to update default leave settings'
    };
  }
};

/**
 * Get employee leave balance
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Object>} Employee leave balance
 */
export const getEmployeeLeaveBalance = async (employeeId) => {
  try {
    const leavesJson = await AsyncStorage.getItem(EMPLOYEE_LEAVES_KEY);
    const allLeaves = leavesJson ? JSON.parse(leavesJson) : {};
    
    if (allLeaves[employeeId]) {
      return allLeaves[employeeId];
    }
    
    // If no custom leave balance, return default settings
    const defaultSettings = await getDefaultLeaveSettings();
    return {
      employeeId,
      annualLeaves: defaultSettings.defaultAnnualLeaves,
      sickLeaves: defaultSettings.defaultSickLeaves,
      casualLeaves: defaultSettings.defaultCasualLeaves,
      usedAnnualLeaves: 0,
      usedSickLeaves: 0,
      usedCasualLeaves: 0,
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
  } catch (error) {
    console.error('Error getting employee leave balance:', error);
    const defaultSettings = await getDefaultLeaveSettings();
    return {
      employeeId,
      annualLeaves: defaultSettings.defaultAnnualLeaves,
      sickLeaves: defaultSettings.defaultSickLeaves,
      casualLeaves: defaultSettings.defaultCasualLeaves,
      usedAnnualLeaves: 0,
      usedSickLeaves: 0,
      usedCasualLeaves: 0,
      isCustom: false
    };
  }
};

/**
 * Update employee leave balance
 * @param {string} employeeId - Employee ID
 * @param {Object} leaveData - Leave balance data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateEmployeeLeaveBalance = async (employeeId, leaveData) => {
  try {
    // Get existing data to preserve used leaves if not provided
    const existingData = await getEmployeeLeaveBalance(employeeId);
    
    const updatedData = {
      employeeId,
      annualLeaves: leaveData.annualLeaves ?? existingData.annualLeaves,
      sickLeaves: leaveData.sickLeaves ?? existingData.sickLeaves,
      casualLeaves: leaveData.casualLeaves ?? existingData.casualLeaves,
      usedAnnualLeaves: leaveData.usedAnnualLeaves ?? existingData.usedAnnualLeaves ?? 0,
      usedSickLeaves: leaveData.usedSickLeaves ?? existingData.usedSickLeaves ?? 0,
      usedCasualLeaves: leaveData.usedCasualLeaves ?? existingData.usedCasualLeaves ?? 0,
      isCustom: true,
      updatedAt: new Date().toISOString()
    };
    
    // Preserve createdAt if it exists
    if (existingData.createdAt) {
      updatedData.createdAt = existingData.createdAt;
    } else {
      updatedData.createdAt = new Date().toISOString();
    }
    
    // Get all leaves and update the specific employee
    const leavesJson = await AsyncStorage.getItem(EMPLOYEE_LEAVES_KEY);
    const allLeaves = leavesJson ? JSON.parse(leavesJson) : {};
    allLeaves[employeeId] = updatedData;
    
    await AsyncStorage.setItem(EMPLOYEE_LEAVES_KEY, JSON.stringify(allLeaves));
    
    return { success: true };
  } catch (error) {
    console.error('Error updating employee leave balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to update employee leave balance'
    };
  }
};

/**
 * Reset employee leave balance to default
 * @param {string} employeeId - Employee ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetEmployeeLeaveToDefault = async (employeeId) => {
  try {
    const defaultSettings = await getDefaultLeaveSettings();
    
    // Get existing used leaves to preserve them
    const existingData = await getEmployeeLeaveBalance(employeeId);
    
    const resetData = {
      employeeId,
      annualLeaves: defaultSettings.defaultAnnualLeaves,
      sickLeaves: defaultSettings.defaultSickLeaves,
      casualLeaves: defaultSettings.defaultCasualLeaves,
      usedAnnualLeaves: existingData.usedAnnualLeaves ?? 0,
      usedSickLeaves: existingData.usedSickLeaves ?? 0,
      usedCasualLeaves: existingData.usedCasualLeaves ?? 0,
      isCustom: false,
      updatedAt: new Date().toISOString()
    };
    
    // Preserve createdAt if it exists
    if (existingData.createdAt) {
      resetData.createdAt = existingData.createdAt;
    } else {
      resetData.createdAt = new Date().toISOString();
    }
    
    // Get all leaves and update the specific employee
    const leavesJson = await AsyncStorage.getItem(EMPLOYEE_LEAVES_KEY);
    const allLeaves = leavesJson ? JSON.parse(leavesJson) : {};
    allLeaves[employeeId] = resetData;
    
    await AsyncStorage.setItem(EMPLOYEE_LEAVES_KEY, JSON.stringify(allLeaves));
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting employee leave balance:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset employee leave balance'
    };
  }
};

/**
 * Get all employees' leave balances
 * @returns {Promise<Array>} Array of employee leave balances
 */
export const getAllEmployeesLeaveBalances = async () => {
  try {
    const leavesJson = await AsyncStorage.getItem(EMPLOYEE_LEAVES_KEY);
    const allLeaves = leavesJson ? JSON.parse(leavesJson) : {};
    
    const leaves = [];
    for (const [employeeId, leaveData] of Object.entries(allLeaves)) {
      leaves.push({
        id: employeeId,
        ...leaveData
      });
    }
    
    return leaves;
  } catch (error) {
    console.error('Error getting all employees leave balances:', error);
    return [];
  }
};

/**
 * Calculate remaining leaves
 * @param {Object} leaveBalance - Leave balance object
 * @returns {Object} Remaining leaves for each type
 */
export const calculateRemainingLeaves = (leaveBalance) => {
  return {
    annual: Math.max(0, (leaveBalance.annualLeaves || 0) - (leaveBalance.usedAnnualLeaves || 0)),
    sick: Math.max(0, (leaveBalance.sickLeaves || 0) - (leaveBalance.usedSickLeaves || 0)),
    casual: Math.max(0, (leaveBalance.casualLeaves || 0) - (leaveBalance.usedCasualLeaves || 0)),
    total: Math.max(0, 
      ((leaveBalance.annualLeaves || 0) + (leaveBalance.sickLeaves || 0) + (leaveBalance.casualLeaves || 0)) -
      ((leaveBalance.usedAnnualLeaves || 0) + (leaveBalance.usedSickLeaves || 0) + (leaveBalance.usedCasualLeaves || 0))
    )
  };
};

/**
 * Create a leave request
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Type of leave: 'annual', 'sick', 'casual'
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} reason - Reason for leave
 * @param {boolean} isHalfDay - Whether this is a half-day leave (default: false)
 * @param {string} halfDayPeriod - For half-day: 'morning' or 'afternoon' (optional)
 * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
 */
export const createLeaveRequest = async (employeeId, leaveType, startDate, endDate, reason = '', isHalfDay = false, halfDayPeriod = null) => {
  try {
    // Validate leave type
    const validTypes = ['annual', 'sick', 'casual'];
    if (!validTypes.includes(leaveType)) {
      return {
        success: false,
        error: 'Invalid leave type. Must be: annual, sick, or casual'
      };
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      };
    }

    // For half-day leave, start and end date must be the same
    if (isHalfDay && startDate !== endDate) {
      return {
        success: false,
        error: 'Half-day leave must be for a single day only'
      };
    }

    if (start > end) {
      return {
        success: false,
        error: 'Start date must be before or equal to end date'
      };
    }

    // Calculate number of days (excluding weekends)
    let days;
    if (isHalfDay) {
      days = 0.5; // Half day
    } else {
      days = calculateWorkingDays(start, end);
    }

    // Check if employee has enough leaves
    const leaveBalance = await getEmployeeLeaveBalance(employeeId);
    const remaining = calculateRemainingLeaves(leaveBalance);
    
    let availableLeaves = 0;
    if (leaveType === 'annual') {
      availableLeaves = remaining.annual;
    } else if (leaveType === 'sick') {
      availableLeaves = remaining.sick;
    } else if (leaveType === 'casual') {
      availableLeaves = remaining.casual;
    }

    if (days > availableLeaves) {
      return {
        success: false,
        error: `Insufficient ${leaveType} leaves. Available: ${availableLeaves} days, Requested: ${days} day${days !== 1 ? 's' : ''}`
      };
    }

    // Create leave request
    const requestId = `leave_${Date.now()}_${employeeId}`;
    const request = {
      id: requestId,
      employeeId,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayPeriod: isHalfDay ? (halfDayPeriod || 'morning') : null,
      status: 'pending', // pending, approved, rejected
      requestedAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
      adminNotes: null
    };

    // Get all requests and add new one
    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    const allRequests = requestsJson ? JSON.parse(requestsJson) : [];
    allRequests.push(request);

    await AsyncStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(allRequests));

    // Send notification to all admins
    try {
      const employee = await getEmployeeById(employeeId);
      const admins = await getAdminUsers();
      
      const leaveTypeLabels = {
        annual: 'Annual Leave',
        sick: 'Sick Leave',
        casual: 'Casual Leave'
      };
      
      const halfDayText = isHalfDay ? ` (Half Day - ${halfDayPeriod || 'morning'})` : '';
      const daysText = isHalfDay ? 'half day' : `${days} day${days !== 1 ? 's' : ''}`;
      const notificationTitle = 'New Leave Request';
      const notificationBody = `${employee ? employee.name : 'An employee'} has submitted a ${leaveTypeLabels[leaveType]} request for ${daysText}${halfDayText} (${startDate}${startDate !== endDate ? ` to ${endDate}` : ''})`;
      
      // Get super admins and department managers
      const superAdmins = await getSuperAdminUsers();
      const departmentManagers = employee && employee.department 
        ? await getManagersByDepartment(employee.department)
        : [];
      
      // Combine all recipients (super admins + department managers)
      const recipients = [...superAdmins, ...departmentManagers];
      
      // Remove duplicates based on username
      const uniqueRecipients = recipients.filter((admin, index, self) =>
        index === self.findIndex(a => a.username === admin.username)
      );
      
      // Send notification to each recipient
      for (const recipient of uniqueRecipients) {
        await createNotification(
          recipient.username,
          notificationTitle,
          notificationBody,
          'leave_request',
          {
            requestId,
            employeeId,
            employeeName: employee ? employee.name : 'Unknown',
            leaveType,
            days,
            startDate,
            endDate,
            // Navigation data
            navigation: {
              screen: 'AdminDashboard',
              params: {
                user: recipient,
                initialTab: 'employees',
                openLeaveRequests: true
              }
            }
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending notification to admins:', notifError);
      // Don't fail the request if notification fails
    }

    console.log(`Leave request created: ${requestId}`);
    return {
      success: true,
      requestId: requestId
    };
  } catch (error) {
    console.error('Error creating leave request:', error);
    return {
      success: false,
      error: error.message || 'Failed to create leave request'
    };
  }
};

/**
 * Get all leave requests for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Array>} Array of leave requests
 */
export const getEmployeeLeaveRequests = async (employeeId) => {
  try {
    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    const allRequests = requestsJson ? JSON.parse(requestsJson) : [];
    
    return allRequests.filter(request => request.employeeId === employeeId);
  } catch (error) {
    console.error('Error getting employee leave requests:', error);
    return [];
  }
};

/**
 * Get all pending leave requests (for admin)
 * @returns {Promise<Array>} Array of pending leave requests
 */
export const getPendingLeaveRequests = async () => {
  try {
    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    const allRequests = requestsJson ? JSON.parse(requestsJson) : [];
    
    return allRequests.filter(request => request.status === 'pending');
  } catch (error) {
    console.error('Error getting pending leave requests:', error);
    return [];
  }
};

/**
 * Get all leave requests (for admin)
 * @returns {Promise<Array>} Array of all leave requests
 */
export const getAllLeaveRequests = async () => {
  try {
    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    return requestsJson ? JSON.parse(requestsJson) : [];
  } catch (error) {
    console.error('Error getting all leave requests:', error);
    return [];
  }
};

/**
 * Process leave request (approve or reject)
 * @param {string} requestId - Leave request ID
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} processedBy - Username of admin who processed
 * @param {string} adminNotes - Admin notes (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const processLeaveRequest = async (requestId, status, processedBy, adminNotes = '') => {
  try {
    if (status !== 'approved' && status !== 'rejected') {
      return {
        success: false,
        error: 'Invalid status. Must be "approved" or "rejected"'
      };
    }

    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    const allRequests = requestsJson ? JSON.parse(requestsJson) : [];
    
    const requestIndex = allRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      return {
        success: false,
        error: 'Leave request not found'
      };
    }

    const request = allRequests[requestIndex];
    
    // Check if already processed
    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Leave request already ${request.status}`
      };
    }

    // Update request status
    request.status = status;
    request.processedAt = new Date().toISOString();
    request.processedBy = processedBy;
    request.adminNotes = adminNotes;

    // If approved, update employee's used leaves
    if (status === 'approved') {
      const leaveBalance = await getEmployeeLeaveBalance(request.employeeId);
      const updatedUsedLeaves = {
        ...leaveBalance
      };

      if (request.leaveType === 'annual') {
        updatedUsedLeaves.usedAnnualLeaves = (updatedUsedLeaves.usedAnnualLeaves || 0) + request.days;
      } else if (request.leaveType === 'sick') {
        updatedUsedLeaves.usedSickLeaves = (updatedUsedLeaves.usedSickLeaves || 0) + request.days;
      } else if (request.leaveType === 'casual') {
        updatedUsedLeaves.usedCasualLeaves = (updatedUsedLeaves.usedCasualLeaves || 0) + request.days;
      }

      await updateEmployeeLeaveBalance(request.employeeId, updatedUsedLeaves);
    }

    // Save updated requests
    allRequests[requestIndex] = request;
    await AsyncStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(allRequests));

    // Send notification to employee
    try {
      const employee = await getEmployeeById(request.employeeId);
      
      if (employee) {
        const leaveTypeLabels = {
          annual: 'Annual Leave',
          sick: 'Sick Leave',
          casual: 'Casual Leave'
        };
        
        const notificationTitle = status === 'approved' 
          ? 'Leave Request Approved' 
          : 'Leave Request Rejected';
        const notificationBody = status === 'approved'
          ? `Your ${leaveTypeLabels[request.leaveType]} request for ${request.days} day${request.days !== 1 ? 's' : ''} (${request.startDate} to ${request.endDate}) has been approved.`
          : `Your ${leaveTypeLabels[request.leaveType]} request for ${request.days} day${request.days !== 1 ? 's' : ''} (${request.startDate} to ${request.endDate}) has been rejected.${adminNotes ? `\n\nNote: ${adminNotes}` : ''}`;
        
        await createNotification(
          employee.username,
          notificationTitle,
          notificationBody,
          status === 'approved' ? 'leave_approved' : 'leave_rejected',
          {
            requestId,
            employeeId: request.employeeId,
            leaveType: request.leaveType,
            days: request.days,
            startDate: request.startDate,
            endDate: request.endDate,
            status,
            processedBy,
            adminNotes,
            // Navigation data
            navigation: {
              screen: 'LeaveRequestScreen',
              params: {
                user: employee
              }
            }
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending notification to employee:', notifError);
      // Don't fail the processing if notification fails
    }

    console.log(`Leave request ${requestId} ${status} by ${processedBy}`);
    return { success: true };
  } catch (error) {
    console.error('Error processing leave request:', error);
    return {
      success: false,
      error: error.message || 'Failed to process leave request'
    };
  }
};

/**
 * Calculate working days between two dates (excluding weekends)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of working days
 */
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday = 1, Friday = 5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

/**
 * Get leave request by ID
 * @param {string} requestId - Leave request ID
 * @returns {Promise<Object|null>} Leave request object or null
 */
export const getLeaveRequestById = async (requestId) => {
  try {
    const requestsJson = await AsyncStorage.getItem(LEAVE_REQUESTS_KEY);
    const allRequests = requestsJson ? JSON.parse(requestsJson) : [];
    
    return allRequests.find(request => request.id === requestId) || null;
  } catch (error) {
    console.error('Error getting leave request by ID:', error);
    return null;
  }
};

/**
 * Get approved leave dates for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Array>} Array of date strings (YYYY-MM-DD) that have approved leaves
 */
export const getApprovedLeaveDates = async (employeeId) => {
  try {
    const requests = await getEmployeeLeaveRequests(employeeId);
    const approvedRequests = requests.filter(req => req.status === 'approved');
    
    const leaveDates = new Set();
    
    approvedRequests.forEach(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      
      // Generate all dates in the range (excluding weekends)
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        // Only include weekdays (Monday = 1, Friday = 5)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateString = current.toISOString().split('T')[0];
          leaveDates.add(dateString);
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return Array.from(leaveDates);
  } catch (error) {
    console.error('Error getting approved leave dates:', error);
    return [];
  }
};

/**
 * Get all leave dates with employee information (for admin)
 * @returns {Promise<Object>} Object with date strings as keys and arrays of leave info as values
 * Format: { 'YYYY-MM-DD': [{ employeeId, employeeName, leaveType, reason, ... }, ...] }
 */
export const getAllLeaveDatesWithEmployees = async () => {
  try {
    const allRequests = await getAllLeaveRequests();
    const approvedRequests = allRequests.filter(req => req.status === 'approved');
    
    const leaveDatesMap = {};
    
    for (const request of approvedRequests) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      
      // Generate all dates in the range (excluding weekends)
      const current = new Date(start);
      while (current <= end) {
        const dayOfWeek = current.getDay();
        // Only include weekdays
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateString = current.toISOString().split('T')[0];
          
          if (!leaveDatesMap[dateString]) {
            leaveDatesMap[dateString] = [];
          }
          
          // Get employee name
          const employee = await getEmployeeById(request.employeeId);
          
          leaveDatesMap[dateString].push({
            employeeId: request.employeeId,
            employeeName: employee ? employee.name : 'Unknown',
            leaveType: request.leaveType,
            reason: request.reason || '',
            days: request.days,
            startDate: request.startDate,
            endDate: request.endDate,
            isHalfDay: request.isHalfDay || false,
            halfDayPeriod: request.halfDayPeriod || null
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    return leaveDatesMap;
  } catch (error) {
    console.error('Error getting all leave dates with employees:', error);
    return {};
  }
};
