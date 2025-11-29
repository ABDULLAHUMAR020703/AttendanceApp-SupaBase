// Employee management utilities
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WORK_MODES } from './workModes';

const EMPLOYEES_KEY = 'company_employees';
const WORK_MODE_REQUESTS_KEY = 'work_mode_requests';
const WORK_MODE_HISTORY_KEY = 'work_mode_history';

/**
 * Initialize default employees - merges with existing employees
 * Adds any missing default employees to the existing list
 */
export const initializeDefaultEmployees = async () => {
  try {
    const existingEmployees = await getEmployees();
    
      const defaultEmployees = [
        {
          id: 'emp_001',
          username: 'testuser',
          name: 'Test User',
          email: 'testuser@company.com',
          role: 'employee',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'Engineering',
          position: 'AI Engineer',
          hireDate: '2023-01-15',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_002',
          username: 'testadmin',
          name: 'Test Admin',
          email: 'admin@company.com',
          role: 'super_admin',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'Management',
          position: 'System Administrator',
          hireDate: '2023-01-01',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_003',
          username: 'john.doe',
          name: 'John Doe',
          email: 'john.doe@company.com',
          role: 'employee',
          workMode: WORK_MODES.SEMI_REMOTE,
          department: 'Engineering',
          position: 'Senior AI Engineer',
          hireDate: '2022-06-10',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_004',
          username: 'jane.smith',
          name: 'Jane Smith',
          email: 'jane.smith@company.com',
          role: 'employee',
          workMode: WORK_MODES.FULLY_REMOTE,
          department: 'Design',
          position: 'UI/UX Designer',
          hireDate: '2022-08-20',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_005',
          username: 'mike.johnson',
          name: 'Mike Johnson',
          email: 'mike.johnson@company.com',
          role: 'employee',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'Sales',
          position: 'Sales Manager',
          hireDate: '2022-03-15',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_006',
          username: 'sarah.williams',
          name: 'Sarah Williams',
          email: 'sarah.williams@company.com',
          role: 'employee',
          workMode: WORK_MODES.SEMI_REMOTE,
          department: 'Marketing',
          position: 'Marketing Specialist',
          hireDate: '2023-02-01',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_007',
          username: 'david.brown',
          name: 'David Brown',
          email: 'david.brown@company.com',
          role: 'employee',
          workMode: WORK_MODES.FULLY_REMOTE,
          department: 'Engineering',
          position: 'DevOps Engineer',
          hireDate: '2022-11-05',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_008',
          username: 'emily.davis',
          name: 'Emily Davis',
          email: 'emily.davis@company.com',
          role: 'employee',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'HR',
          position: 'HR Coordinator',
          hireDate: '2023-04-12',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_010',
          username: 'hrmanager',
          name: 'HR Manager',
          email: 'hrmanager@company.com',
          role: 'manager',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'HR',
          position: 'HR Manager',
          hireDate: '2022-03-01',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_011',
          username: 'techmanager',
          name: 'Tech Manager',
          email: 'techmanager@company.com',
          role: 'manager',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'Engineering',
          position: 'Engineering Manager',
          hireDate: '2022-02-15',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'emp_012',
          username: 'salesmanager',
          name: 'Sales Manager',
          email: 'salesmanager@company.com',
          role: 'manager',
          workMode: WORK_MODES.IN_OFFICE,
          department: 'Sales',
          position: 'Sales Manager',
          hireDate: '2022-01-20',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      // If no existing employees, just save the defaults
      if (existingEmployees.length === 0) {
      await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(defaultEmployees));
      console.log('Default employees initialized');
      } else {
        // Merge: Add any missing default employees
        const existingUsernames = new Set(existingEmployees.map(emp => emp.username));
        const missingEmployees = defaultEmployees.filter(emp => !existingUsernames.has(emp.username));
        
        if (missingEmployees.length > 0) {
          const mergedEmployees = [...existingEmployees, ...missingEmployees];
          await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(mergedEmployees));
          console.log(`Added ${missingEmployees.length} new default employees`);
        } else {
          console.log('All default employees already exist');
        }
    }
  } catch (error) {
    console.error('Error initializing default employees:', error);
  }
};

/**
 * Get all employees
 * @returns {Promise<Array>} Array of employee objects
 */
export const getEmployees = async () => {
  try {
    const employees = await AsyncStorage.getItem(EMPLOYEES_KEY);
    return employees ? JSON.parse(employees) : [];
  } catch (error) {
    console.error('Error getting employees:', error);
    return [];
  }
};

/**
 * Get employee by username
 * @param {string} username - Username to search for
 * @returns {Promise<Object|null>} Employee object or null
 */
export const getEmployeeByUsername = async (username) => {
  try {
    const employees = await getEmployees();
    return employees.find(emp => emp.username === username) || null;
  } catch (error) {
    console.error('Error getting employee by username:', error);
    return null;
  }
};

/**
 * Get employee by ID
 * @param {string} employeeId - Employee ID to search for
 * @returns {Promise<Object|null>} Employee object or null
 */
export const getEmployeeById = async (employeeId) => {
  try {
    const employees = await getEmployees();
    return employees.find(emp => emp.id === employeeId) || null;
  } catch (error) {
    console.error('Error getting employee by ID:', error);
    return null;
  }
};

/**
 * Get all admin users (super_admins and managers only)
 * @returns {Promise<Array>} Array of admin employee objects
 */
export const getAdminUsers = async () => {
  try {
    const employees = await getEmployees();
    return employees.filter(emp => 
      (emp.role === 'super_admin' || emp.role === 'manager') && emp.isActive
    );
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
};

/**
 * Get super admin users only
 * @returns {Promise<Array>} Array of super admin employee objects
 */
export const getSuperAdminUsers = async () => {
  try {
    const employees = await getEmployees();
    return employees.filter(emp => emp.role === 'super_admin' && emp.isActive);
  } catch (error) {
    console.error('Error getting super admin users:', error);
    return [];
  }
};

/**
 * Get managers for a specific department
 * @param {string} department - Department name
 * @returns {Promise<Array>} Array of manager employee objects for the department
 */
export const getManagersByDepartment = async (department) => {
  try {
    const employees = await getEmployees();
    return employees.filter(emp => 
      emp.role === 'manager' && 
      emp.department === department && 
      emp.isActive
    );
  } catch (error) {
    console.error('Error getting managers by department:', error);
    return [];
  }
};

/**
 * Get employees that a user can manage
 * @param {Object} user - User object with role and department
 * @returns {Promise<Array>} Array of employees the user can manage
 */
export const getManageableEmployees = async (user) => {
  try {
    const employees = await getEmployees();
    
    // Super admins can manage everyone
    if (user.role === 'super_admin') {
      return employees.filter(emp => emp.isActive);
    }
    
    // Managers can only manage employees in their department
    if (user.role === 'manager') {
      return employees.filter(emp => 
        emp.isActive && 
        emp.department === user.department &&
        emp.role !== 'super_admin' // Managers can't manage super admins
      );
    }
    
    // Employees and regular admins can't manage anyone
    return [];
  } catch (error) {
    console.error('Error getting manageable employees:', error);
    return [];
  }
};

/**
 * Check if a user can manage a specific employee
 * @param {Object} user - User object with role and department
 * @param {Object} employee - Employee to check
 * @returns {boolean} Whether the user can manage the employee
 */
export const canManageEmployee = (user, employee) => {
  if (!user || !employee) return false;
  
  // Super admins can manage everyone
  if (user.role === 'super_admin') {
    return true;
  }
  
  // Managers can only manage employees in their department
  if (user.role === 'manager') {
    return employee.department === user.department && employee.role !== 'super_admin';
  }
  
  // Only super admins and managers can manage employees
  return false;
};

/**
 * Update employee work mode
 * @param {string} employeeId - Employee ID
 * @param {string} newWorkMode - New work mode
 * @param {string} changedBy - Username who made the change
 * @returns {Promise<boolean>} Success status
 */
export const updateEmployeeWorkMode = async (employeeId, newWorkMode, changedBy) => {
  try {
    const employees = await getEmployees();
    const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
    
    if (employeeIndex === -1) {
      throw new Error('Employee not found');
    }
    
    const oldWorkMode = employees[employeeIndex].workMode;
    employees[employeeIndex].workMode = newWorkMode;
    employees[employeeIndex].lastUpdated = new Date().toISOString();
    
    // Save updated employees
    await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    
    // Add to work mode history
    await addWorkModeHistory(employeeId, oldWorkMode, newWorkMode, changedBy);
    
    console.log(`Work mode updated for ${employees[employeeIndex].name}: ${oldWorkMode} → ${newWorkMode}`);
    return true;
  } catch (error) {
    console.error('Error updating employee work mode:', error);
    return false;
  }
};

/**
 * Add work mode change to history
 * @param {string} employeeId - Employee ID
 * @param {string} fromMode - Previous work mode
 * @param {string} toMode - New work mode
 * @param {string} changedBy - Username who made the change
 */
export const addWorkModeHistory = async (employeeId, fromMode, toMode, changedBy) => {
  try {
    const history = await getWorkModeHistory();
    const historyEntry = {
      id: Date.now().toString(),
      employeeId,
      fromMode,
      toMode,
      changedBy,
      timestamp: new Date().toISOString()
    };
    
    history.push(historyEntry);
    await AsyncStorage.setItem(WORK_MODE_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error adding work mode history:', error);
  }
};

/**
 * Get work mode history
 * @returns {Promise<Array>} Array of work mode change records
 */
export const getWorkModeHistory = async () => {
  try {
    const history = await AsyncStorage.getItem(WORK_MODE_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting work mode history:', error);
    return [];
  }
};

/**
 * Get work mode history for specific employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<Array>} Array of work mode changes for employee
 */
export const getEmployeeWorkModeHistory = async (employeeId) => {
  try {
    const history = await getWorkModeHistory();
    return history.filter(entry => entry.employeeId === employeeId);
  } catch (error) {
    console.error('Error getting employee work mode history:', error);
    return [];
  }
};

/**
 * Create work mode change request
 * @param {string} employeeId - Employee ID
 * @param {string} requestedMode - Requested work mode
 * @param {string} reason - Reason for request
 * @returns {Promise<boolean>} Success status
 */
export const createWorkModeRequest = async (employeeId, requestedMode, reason) => {
  try {
    const requests = await getWorkModeRequests();
    const request = {
      id: Date.now().toString(),
      employeeId,
      requestedMode,
      currentMode: null, // Will be filled when processing
      reason,
      status: 'pending', // pending, approved, rejected
      requestedAt: new Date().toISOString(),
      processedAt: null,
      processedBy: null,
      adminNotes: null
    };
    
    requests.push(request);
    await AsyncStorage.setItem(WORK_MODE_REQUESTS_KEY, JSON.stringify(requests));
    
    console.log(`Work mode request created for employee ${employeeId}: ${requestedMode}`);
    return true;
  } catch (error) {
    console.error('Error creating work mode request:', error);
    return false;
  }
};

/**
 * Get all work mode requests
 * @returns {Promise<Array>} Array of work mode requests
 */
export const getWorkModeRequests = async () => {
  try {
    const requests = await AsyncStorage.getItem(WORK_MODE_REQUESTS_KEY);
    return requests ? JSON.parse(requests) : [];
  } catch (error) {
    console.error('Error getting work mode requests:', error);
    return [];
  }
};

/**
 * Get pending work mode requests
 * @returns {Promise<Array>} Array of pending requests
 */
export const getPendingWorkModeRequests = async () => {
  try {
    const requests = await getWorkModeRequests();
    return requests.filter(request => request.status === 'pending');
  } catch (error) {
    console.error('Error getting pending work mode requests:', error);
    return [];
  }
};

/**
 * Process work mode request (approve or reject)
 * @param {string} requestId - Request ID
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} processedBy - Username of admin who processed
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<boolean>} Success status
 */
export const processWorkModeRequest = async (requestId, status, processedBy, adminNotes = '') => {
  try {
    const requests = await getWorkModeRequests();
    const requestIndex = requests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      throw new Error('Request not found');
    }
    
    const request = requests[requestIndex];
    request.status = status;
    request.processedAt = new Date().toISOString();
    request.processedBy = processedBy;
    request.adminNotes = adminNotes;
    
    // If approved, update employee work mode
    if (status === 'approved') {
      const employee = await getEmployeeByUsername(request.employeeId);
      if (employee) {
        await updateEmployeeWorkMode(employee.id, request.requestedMode, processedBy);
      }
    }
    
    await AsyncStorage.setItem(WORK_MODE_REQUESTS_KEY, JSON.stringify(requests));
    
    console.log(`Work mode request ${requestId} ${status} by ${processedBy}`);
    return true;
  } catch (error) {
    console.error('Error processing work mode request:', error);
    return false;
  }
};

/**
 * Get work mode statistics
 * @returns {Promise<Object>} Statistics object
 */
export const getWorkModeStatistics = async () => {
  try {
    const employees = await getEmployees();
    const stats = {
      total: employees.length,
      inOffice: 0,
      semiRemote: 0,
      fullyRemote: 0
    };
    
    employees.forEach(emp => {
      switch (emp.workMode) {
        case WORK_MODES.IN_OFFICE:
          stats.inOffice++;
          break;
        case WORK_MODES.SEMI_REMOTE:
          stats.semiRemote++;
          break;
        case WORK_MODES.FULLY_REMOTE:
          stats.fullyRemote++;
          break;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting work mode statistics:', error);
    return { total: 0, inOffice: 0, semiRemote: 0, fullyRemote: 0 };
  }
};
