// Auth Feature - Public API
// Export all auth-related functionality from this module

export { authenticateUser, checkUsernameExists, createUser, updateUserRole, updateUserInfo } from './services/authService';

// Re-export for backward compatibility
export { authenticateUser as default } from './services/authService';

