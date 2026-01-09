/**
 * Attendance Feature - Public API
 * Export all attendance-related functionality from this module
 */

// Services
export {
  isAutoCheckoutEnabled,
  getAttendanceConfig,
  setAttendanceConfig,
  setAutoCheckoutEnabled,
  clearAllConfigCache,
} from './services/attendanceConfigService';
