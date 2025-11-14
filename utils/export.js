import * as FileSystem from 'expo-file-system/legacy';
import { getAttendanceRecords } from './storage';
import { getAllLeaveRequests, getAllEmployeesLeaveBalances } from './leaveManagement';
import { getEmployees } from './employees';

/**
 * Export attendance records to CSV format
 * @returns {Promise<{success: boolean, fileUri?: string, error?: string}>}
 */
export const exportAttendanceToCSV = async () => {
  try {
    const records = await getAttendanceRecords();
    
    if (records.length === 0) {
      return {
        success: false,
        error: 'No attendance records found to export'
      };
    }
    
    // Create CSV header
    let csvContent = 'Username,Date,Time,Type,Latitude,Longitude,Photo\n';
    
    // Add records to CSV
    records.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString();
      const time = new Date(record.timestamp).toLocaleTimeString();
      const lat = record.location ? record.location.latitude : '';
      const lng = record.location ? record.location.longitude : '';
      const photo = record.photo ? 'Yes' : 'No';
      
      csvContent += `${record.username},${date},${time},${record.type},${lat},${lng},${photo}\n`;
    });
    
    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `attendance_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write CSV file
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    return {
      success: true,
      fileUri: fileUri,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Share CSV file using Expo sharing
 * @param {string} fileUri - URI of the CSV file
 * @param {string} fileName - Name of the file
 */
export const shareCSVFile = async (fileUri, fileName) => {
  try {
    // Note: expo-sharing is not included in the dependencies
    // This is a placeholder for the sharing functionality
    // In a real app, you would import and use expo-sharing
    console.log('File ready for sharing:', fileUri);
    return { success: true, fileUri, fileName };
  } catch (error) {
    console.error('Error sharing file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate comprehensive attendance report
 * @returns {Promise<{success: boolean, fileUri?: string, fileName?: string, error?: string}>}
 */
export const generateAttendanceReport = async () => {
  try {
    const records = await getAttendanceRecords();
    const employees = await getEmployees();
    
    if (records.length === 0) {
      return {
        success: false,
        error: 'No attendance records found to export'
      };
    }
    
    // Create CSV header
    let csvContent = 'Employee Name,Username,Date,Time,Type,Location,Auth Method\n';
    
    // Add records to CSV
    records.forEach(record => {
      const employee = employees.find(emp => emp.username === record.username);
      const employeeName = employee ? employee.name : record.username;
      const date = new Date(record.timestamp).toLocaleDateString();
      const time = new Date(record.timestamp).toLocaleTimeString();
      const location = record.location && record.location.address 
        ? record.location.address 
        : (record.location ? `${record.location.latitude}, ${record.location.longitude}` : 'N/A');
      const authMethod = record.authMethod || 'N/A';
      
      csvContent += `${employeeName},${record.username},${date},${time},${record.type},${location},${authMethod}\n`;
    });
    
    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `attendance_report_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write CSV file
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    return {
      success: true,
      fileUri: fileUri,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate attendance report'
    };
  }
};

/**
 * Generate comprehensive leave report
 * @returns {Promise<{success: boolean, fileUri?: string, fileName?: string, error?: string}>}
 */
export const generateLeaveReport = async () => {
  try {
    const leaveRequests = await getAllLeaveRequests();
    const leaveBalances = await getAllEmployeesLeaveBalances();
    const employees = await getEmployees();
    
    if (leaveRequests.length === 0 && leaveBalances.length === 0) {
      return {
        success: false,
        error: 'No leave data found to export'
      };
    }
    
    // Create CSV content
    let csvContent = 'Employee Name,Employee ID,Leave Type,Start Date,End Date,Days,Status,Requested Date,Processed Date,Processed By,Reason\n';
    
    // Add leave requests
    leaveRequests.forEach(request => {
      const employee = employees.find(emp => emp.id === request.employeeId);
      const employeeName = employee ? employee.name : request.employeeId;
      const requestedDate = request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A';
      const processedDate = request.processedAt ? new Date(request.processedAt).toLocaleDateString() : 'N/A';
      const processedBy = request.processedBy || 'N/A';
      const reason = request.reason || 'N/A';
      
      csvContent += `${employeeName},${request.employeeId},${request.leaveType},${request.startDate},${request.endDate},${request.days},${request.status},${requestedDate},${processedDate},${processedBy},${reason}\n`;
    });
    
    // Add separator and leave balances
    csvContent += '\n\nLeave Balances\n';
    csvContent += 'Employee Name,Employee ID,Annual Leaves (Total),Annual Leaves (Used),Annual Leaves (Remaining),Sick Leaves (Total),Sick Leaves (Used),Sick Leaves (Remaining),Casual Leaves (Total),Casual Leaves (Used),Casual Leaves (Remaining)\n';
    
    leaveBalances.forEach(balance => {
      const employee = employees.find(emp => emp.id === balance.employeeId);
      const employeeName = employee ? employee.name : balance.employeeId;
      const annualRemaining = (balance.annualLeaves || 0) - (balance.usedAnnualLeaves || 0);
      const sickRemaining = (balance.sickLeaves || 0) - (balance.usedSickLeaves || 0);
      const casualRemaining = (balance.casualLeaves || 0) - (balance.usedCasualLeaves || 0);
      
      csvContent += `${employeeName},${balance.employeeId},${balance.annualLeaves || 0},${balance.usedAnnualLeaves || 0},${annualRemaining},${balance.sickLeaves || 0},${balance.usedSickLeaves || 0},${sickRemaining},${balance.casualLeaves || 0},${balance.usedCasualLeaves || 0},${casualRemaining}\n`;
    });
    
    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `leave_report_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write CSV file
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    return {
      success: true,
      fileUri: fileUri,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error generating leave report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate leave report'
    };
  }
};
