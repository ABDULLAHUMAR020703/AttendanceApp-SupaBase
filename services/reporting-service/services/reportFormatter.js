/**
 * Report Formatter - Aggregates and formats data into standard report schema
 */
const {
  getAllEmployees,
  getEmployeesByDepartment,
  getAttendanceRecords,
  getLeaveRequests,
  getTickets,
} = require('./queryService');
const { getDateRange, formatDate, getPeriodLabel } = require('../utils/dateUtils');

/**
 * Calculate attendance rate for a set of employees and records
 * @param {Array} employees - Array of employee objects
 * @param {Array} records - Array of attendance records
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {string} Attendance rate as percentage
 */
function calculateAttendanceRate(employees, records, from, to) {
  if (!employees || employees.length === 0) return '0%';

  // Calculate expected work days (excluding weekends)
  const workDays = calculateWorkDays(from, to);
  const expectedCheckIns = employees.length * workDays;

  if (expectedCheckIns === 0) return '0%';

  // Count actual check-ins
  const checkInCount = records.filter(r => r.type === 'checkin').length;
  const rate = (checkInCount / expectedCheckIns) * 100;

  return `${Math.round(rate)}%`;
}

/**
 * Calculate work days between two dates (excluding weekends)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {number} Number of work days
 */
function calculateWorkDays(from, to) {
  let count = 0;
  const current = new Date(from);
  
  while (current <= to) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Generate report data in standard schema
 * @param {string} range - Report range type
 * @param {string} from - Custom start date (optional)
 * @param {string} to - Custom end date (optional)
 * @returns {Promise<Object>} Formatted report data
 */
async function generateReportData(range, from = null, to = null) {
  try {
    // Get date range
    const dateRange = getDateRange(range, from, to);
    const { from: fromDate, to: toDate } = dateRange;

    // Fetch all data in parallel
    const [allEmployees, attendanceRecords, leaveRequests, tickets] = await Promise.all([
      getAllEmployees(),
      getAttendanceRecords(fromDate, toDate),
      getLeaveRequests(fromDate, toDate),
      getTickets(fromDate, toDate),
    ]);

    // Get unique departments
    const departments = [...new Set(allEmployees.map(emp => emp.department).filter(Boolean))];

    // Calculate overall statistics
    const overall = {
      totalEmployees: allEmployees.length,
      attendanceRate: calculateAttendanceRate(allEmployees, attendanceRecords, fromDate, toDate),
      pendingLeaves: leaveRequests.filter(lr => lr.status === 'pending').length,
      openTickets: tickets.filter(t => t.status === 'open' || t.status === 'pending').length,
    };

    // Calculate department-wise statistics
    const departmentStats = departments.map(dept => {
      const deptEmployees = allEmployees.filter(emp => emp.department === dept);
      // Support both id and username matching (some tables use username as employee_id)
      const deptEmployeeIds = deptEmployees.map(emp => emp.id || emp.uid).filter(Boolean);
      const deptEmployeeUsernames = deptEmployees.map(emp => emp.username).filter(Boolean);
      const deptIdentifiers = [...deptEmployeeIds, ...deptEmployeeUsernames];
      
      const deptAttendanceRecords = attendanceRecords.filter(ar => 
        deptIdentifiers.includes(ar.employee_id) || deptIdentifiers.includes(ar.employee_uid)
      );
      const deptLeaveRequests = leaveRequests.filter(lr => 
        deptIdentifiers.includes(lr.employee_id) || deptIdentifiers.includes(lr.employee_uid)
      );
      const deptTickets = tickets.filter(t => 
        deptIdentifiers.includes(t.created_by) || deptIdentifiers.includes(t.created_by_uid)
      );

      return {
        name: dept,
        employees: deptEmployees.length,
        attendanceRate: calculateAttendanceRate(deptEmployees, deptAttendanceRecords, fromDate, toDate),
        leaves: deptLeaveRequests.length,
        tickets: deptTickets.length,
      };
    });

    // Build report data structure
    const reportData = {
      period: {
        type: range,
        from: formatDate(fromDate),
        to: formatDate(toDate),
        label: getPeriodLabel(range, fromDate, toDate),
      },
      overall,
      departments: departmentStats,
    };

    return reportData;
  } catch (error) {
    console.error('Error generating report data:', error);
    throw error;
  }
}

module.exports = {
  generateReportData,
  calculateAttendanceRate,
  calculateWorkDays,
};

