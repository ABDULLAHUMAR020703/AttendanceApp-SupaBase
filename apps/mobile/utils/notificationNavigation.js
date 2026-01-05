/**
 * CENTRALIZED NOTIFICATION NAVIGATION HANDLER
 * 
 * This module provides a single, safe way to handle notification navigation.
 * All notification taps should use this handler to ensure:
 * - Role-aware routing
 * - Safe navigation (no crashes)
 * - Proper fallbacks
 * - Consistent behavior
 */

// Import route constants to ensure consistency
import { ROUTES } from '../shared/constants/routes';

/**
 * Role-based route mapping
 * Maps notification types to screens based on user role
 */

const ROLE_ROUTE_MAP = {
  // Ticket notifications
  ticket_created: {
    manager: ROUTES.HR_DASHBOARD, // HR Dashboard for managers
    super_admin: ROUTES.HR_DASHBOARD, // HR Dashboard for super admins
    employee: null, // Employees don't see ticket creation notifications
  },
  ticket_assigned: {
    manager: ROUTES.HR_DASHBOARD, // HR Dashboard for managers
    super_admin: ROUTES.HR_DASHBOARD, // HR Dashboard for super admins
    employee: null,
  },
  ticket_response: {
    manager: ROUTES.HR_DASHBOARD,
    super_admin: ROUTES.HR_DASHBOARD,
    employee: ROUTES.TICKET_SCREEN, // Employees see their own tickets
  },
  ticket_updated: {
    manager: ROUTES.HR_DASHBOARD,
    super_admin: ROUTES.HR_DASHBOARD,
    employee: ROUTES.TICKET_SCREEN,
  },
  
  // Leave notifications
  leave_request: {
    manager: ROUTES.HR_DASHBOARD, // HR Dashboard for managers to approve
    super_admin: ROUTES.HR_DASHBOARD, // HR Dashboard for super admins
    employee: null,
  },
  leave_approved: {
    manager: null,
    super_admin: null,
    employee: ROUTES.LEAVE_REQUEST, // Employees see their leave status
  },
  leave_rejected: {
    manager: null,
    super_admin: null,
    employee: ROUTES.LEAVE_REQUEST,
  },
  
  // System notifications
  system: {
    manager: ROUTES.NOTIFICATIONS,
    super_admin: ROUTES.NOTIFICATIONS,
    employee: ROUTES.NOTIFICATIONS,
  },
  general: {
    manager: ROUTES.NOTIFICATIONS,
    super_admin: ROUTES.NOTIFICATIONS,
    employee: ROUTES.NOTIFICATIONS,
  },
};

/**
 * Get the appropriate screen for a notification based on type and role
 * @param {string} notificationType - Type of notification
 * @param {string} userRole - User's role
 * @param {Object} notificationData - Notification data object
 * @returns {Object|null} { screen, params } or null if no route
 */
export const getNotificationRoute = (notificationType, userRole, notificationData = {}) => {
  // First, check if notification has explicit navigation data
  if (notificationData?.navigation) {
    const { screen, params } = notificationData.navigation;
    if (screen) {
      return { screen, params: params || {} };
    }
  }
  
  // Fallback to role-based routing
  const roleMap = ROLE_ROUTE_MAP[notificationType];
  if (!roleMap) {
    if (__DEV__) {
      console.warn(`[NotificationNav] No route mapping for type: ${notificationType}`);
    }
    return null;
  }
  
  const targetScreen = roleMap[userRole];
  if (!targetScreen) {
    if (__DEV__) {
      console.warn(`[NotificationNav] No route for type ${notificationType} and role ${userRole}`);
    }
    return null;
  }
  
  // Build params based on notification type and data
  const params = buildRouteParams(notificationType, notificationData, userRole);
  
  return { screen: targetScreen, params };
};

/**
 * Build route parameters based on notification type
 * @param {string} notificationType - Type of notification
 * @param {Object} notificationData - Notification data
 * @param {string} userRole - User's role
 * @returns {Object} Route parameters
 */
const buildRouteParams = (notificationType, notificationData, userRole) => {
  const baseParams = {};
  
  // Add user to params if available
  if (notificationData.user) {
    baseParams.user = notificationData.user;
  }
  
  // Type-specific params
  switch (notificationType) {
    case 'ticket_created':
    case 'ticket_assigned':
      // For HR Dashboard, open tickets tab and optionally highlight specific ticket
      if (userRole === 'manager' || userRole === 'super_admin') {
        baseParams.initialTab = 'tickets';
        if (notificationData.ticketId) {
          baseParams.ticketId = notificationData.ticketId;
        }
      }
      break;
      
    case 'ticket_response':
    case 'ticket_updated':
      if (notificationData.ticketId) {
        baseParams.ticketId = notificationData.ticketId;
      }
      // For HR Dashboard, open tickets tab
      if (userRole === 'manager' || userRole === 'super_admin') {
        baseParams.initialTab = 'tickets';
      }
      break;
      
    case 'leave_request':
      // For HR Dashboard, open leave requests tab
      if (userRole === 'manager' || userRole === 'super_admin') {
        baseParams.initialTab = 'leaves';
        baseParams.openLeaveRequests = true;
      }
      break;
      
    case 'leave_approved':
    case 'leave_rejected':
      // For employees, just navigate to leave request screen
      // User is already in context
      break;
      
    default:
      break;
  }
  
  return baseParams;
};

/**
 * Validate if a route exists and is accessible
 * @param {Object} navigation - React Navigation object
 * @param {string} screenName - Screen name to validate
 * @param {string} userRole - User's role
 * @returns {boolean} Whether route is valid and accessible
 */
const validateRoute = (navigation, screenName, userRole) => {
  if (!screenName) {
    return false;
  }
  
  // Check if navigation object has the screen
  // Note: React Navigation doesn't expose a direct way to check route existence
  // We'll rely on try-catch in the navigation handler
  return true;
};

/**
 * Handle notification press with safe navigation
 * @param {Object} notification - Notification object
 * @param {Object} navigation - React Navigation object
 * @param {Object} user - Current user object
 * @param {Function} onMarkAsRead - Function to mark notification as read
 * @returns {Promise<boolean>} Whether navigation was successful
 */
export const handleNotificationNavigation = async (
  notification,
  navigation,
  user,
  onMarkAsRead
) => {
  if (!notification || !navigation || !user) {
    if (__DEV__) {
      console.warn('[NotificationNav] Missing required parameters for navigation');
    }
    return false;
  }
  
  const notificationType = notification.type || 'system';
  const notificationData = notification.data || {};
  const userRole = user.role || 'employee';
  
  if (__DEV__) {
    console.log(`[NotificationNav] Handling notification:`, {
      type: notificationType,
      role: userRole,
      hasNavData: !!notificationData.navigation
    });
  }
  
  // Get the route for this notification
  const route = getNotificationRoute(notificationType, userRole, notificationData);
  
  if (!route || !route.screen) {
    if (__DEV__) {
      console.warn(`[NotificationNav] No route found for notification type: ${notificationType}, role: ${userRole}`);
    }
    // Fallback: stay on notifications screen
    return false;
  }
  
  // Ensure user is in params (required for most screens)
  const params = {
    ...route.params,
    user: route.params.user || user,
  };
  
  // Attempt navigation with error handling
  try {
    if (__DEV__) {
      console.log(`[NotificationNav] Navigating to: ${route.screen}`, {
        paramsKeys: Object.keys(params)
      });
    }
    
    // Navigate to the target screen
    // Note: Since we're in a nested navigator (Drawer > MainStack), we need to navigate
    // through the MainStack. The CustomDrawer uses this pattern, so we'll use it too.
    // Try navigating through MainStack first (this is the correct pattern for nested navigators)
    try {
      navigation.navigate('MainStack', {
        screen: route.screen,
        params: params
      });
    } catch (nestedNavError) {
      // If nested navigation fails, try direct navigation as fallback
      if (__DEV__) {
        console.log(`[NotificationNav] MainStack navigation failed, trying direct navigation`);
      }
      try {
        navigation.navigate(route.screen, params);
      } catch (directNavError) {
        // Both failed - throw the original nested error
        throw nestedNavError;
      }
    }
    
    // Mark as read AFTER successful navigation (non-blocking)
    // Use setTimeout to ensure navigation completes first
    setTimeout(async () => {
      if (onMarkAsRead && !notification.read && !notification.isRead) {
        try {
          await onMarkAsRead(notification.id);
          if (__DEV__) {
            console.log(`[NotificationNav] ✓ Notification marked as read`);
          }
        } catch (readError) {
          // Non-critical - navigation succeeded
          if (__DEV__) {
            console.warn('[NotificationNav] Failed to mark notification as read:', readError);
          }
        }
      }
    }, 100); // Small delay to ensure navigation completes
    
    if (__DEV__) {
      console.log(`[NotificationNav] ✓ Navigation successful`);
    }
    
    return true;
  } catch (error) {
    // Navigation failed - log and fallback
    console.error('[NotificationNav] Navigation error:', error);
    
    if (__DEV__) {
      console.warn('[NotificationNav] Falling back to notifications screen');
    }
    
    // Fallback: navigate to notifications screen (safe default)
    try {
      navigation.navigate(ROUTES.NOTIFICATIONS, { user });
    } catch (fallbackError) {
      // Even fallback failed - this is very rare
      console.error('[NotificationNav] Fallback navigation also failed:', fallbackError);
    }
    
    return false;
  }
};

/**
 * Check if user has access to a notification's target screen
 * @param {string} notificationType - Notification type
 * @param {string} userRole - User's role
 * @returns {boolean} Whether user has access
 */
export const canAccessNotification = (notificationType, userRole) => {
  const roleMap = ROLE_ROUTE_MAP[notificationType];
  if (!roleMap) {
    return false;
  }
  
  return !!roleMap[userRole];
};

