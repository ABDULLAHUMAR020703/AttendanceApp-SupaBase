/**
 * Query Service - Read-only database queries for report generation
 * All queries use Supabase Service Role Key for read-only access
 */
const { supabase } = require('../config/supabase');

/**
 * Get all active employees
 * @returns {Promise<Array>} Array of employee objects
 */
async function getAllEmployees() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, name, email, role, department, position, work_mode, is_active')
      .eq('is_active', true)
      .order('department', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

/**
 * Get employees by department
 * @param {string} department - Department name
 * @returns {Promise<Array>} Array of employee objects
 */
async function getEmployeesByDepartment(department) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, uid, username, name, email, role, department, position, work_mode, is_active')
      .eq('is_active', true)
      .eq('department', department)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    throw error;
  }
}

/**
 * Get attendance records within date range
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Array>} Array of attendance records
 */
async function getAttendanceRecords(from, to) {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }
}

/**
 * Get leave requests within date range
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Array>} Array of leave requests
 */
async function getLeaveRequests(from, to) {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .gte('start_date', formatDate(from))
      .lte('end_date', formatDate(to))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    throw error;
  }
}

/**
 * Get tickets within date range
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<Array>} Array of tickets
 */
async function getTickets(from, to) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
}

/**
 * Get super admin email
 * @returns {Promise<string>} Super admin email address
 */
async function getSuperAdminEmail() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) throw error;
    return data?.email || null;
  } catch (error) {
    console.error('Error fetching super admin email:', error);
    throw error;
  }
}

/**
 * Helper function to format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

module.exports = {
  getAllEmployees,
  getEmployeesByDepartment,
  getAttendanceRecords,
  getLeaveRequests,
  getTickets,
  getSuperAdminEmail,
};

