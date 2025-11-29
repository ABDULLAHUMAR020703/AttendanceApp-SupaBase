// Ticket Management Utilities using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNotification } from './notifications';
import { getAdminUsers } from './employees';

const TICKETS_KEY = 'tickets';

// Ticket Categories
export const TICKET_CATEGORIES = {
  TECHNICAL: 'technical',
  HR: 'hr',
  FINANCE: 'finance',
  FACILITIES: 'facilities',
  OTHER: 'other'
};

// Ticket Priorities
export const TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Ticket Status
export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

// Category Labels
export const getCategoryLabel = (category) => {
  const labels = {
    [TICKET_CATEGORIES.TECHNICAL]: 'Technical',
    [TICKET_CATEGORIES.HR]: 'HR',
    [TICKET_CATEGORIES.FINANCE]: 'Finance',
    [TICKET_CATEGORIES.FACILITIES]: 'Facilities',
    [TICKET_CATEGORIES.OTHER]: 'Other'
  };
  return labels[category] || category;
};

// Priority Labels
export const getPriorityLabel = (priority) => {
  const labels = {
    [TICKET_PRIORITIES.LOW]: 'Low',
    [TICKET_PRIORITIES.MEDIUM]: 'Medium',
    [TICKET_PRIORITIES.HIGH]: 'High',
    [TICKET_PRIORITIES.URGENT]: 'Urgent'
  };
  return labels[priority] || priority;
};

// Status Labels
export const getStatusLabel = (status) => {
  const labels = {
    [TICKET_STATUS.OPEN]: 'Open',
    [TICKET_STATUS.IN_PROGRESS]: 'In Progress',
    [TICKET_STATUS.RESOLVED]: 'Resolved',
    [TICKET_STATUS.CLOSED]: 'Closed'
  };
  return labels[status] || status;
};

// Priority Colors
export const getPriorityColor = (priority) => {
  const colors = {
    [TICKET_PRIORITIES.LOW]: '#10b981', // Green
    [TICKET_PRIORITIES.MEDIUM]: '#3b82f6', // Blue
    [TICKET_PRIORITIES.HIGH]: '#f59e0b', // Amber
    [TICKET_PRIORITIES.URGENT]: '#ef4444' // Red
  };
  return colors[priority] || '#6b7280';
};

// Status Colors
export const getStatusColor = (status) => {
  const colors = {
    [TICKET_STATUS.OPEN]: '#3b82f6', // Blue
    [TICKET_STATUS.IN_PROGRESS]: '#f59e0b', // Amber
    [TICKET_STATUS.RESOLVED]: '#10b981', // Green
    [TICKET_STATUS.CLOSED]: '#6b7280' // Gray
  };
  return colors[status] || '#6b7280';
};

/**
 * Create a new ticket
 * @param {string} createdBy - Username of the person creating the ticket
 * @param {string} category - Ticket category
 * @param {string} priority - Ticket priority
 * @param {string} subject - Ticket subject
 * @param {string} description - Ticket description
 * @returns {Promise<{success: boolean, ticketId?: string, error?: string}>}
 */
export const createTicket = async (createdBy, category, priority, subject, description) => {
  try {
    // Validate category
    if (!Object.values(TICKET_CATEGORIES).includes(category)) {
      return {
        success: false,
        error: 'Invalid ticket category'
      };
    }

    // Validate priority
    if (!Object.values(TICKET_PRIORITIES).includes(priority)) {
      return {
        success: false,
        error: 'Invalid ticket priority'
      };
    }

    if (!subject.trim() || !description.trim()) {
      return {
        success: false,
        error: 'Subject and description are required'
      };
    }

    // Create ticket
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ticket = {
      id: ticketId,
      createdBy,
      category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      status: TICKET_STATUS.OPEN,
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      closedAt: null,
      responses: []
    };

    // Get all tickets and add new one
    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    allTickets.push(ticket);

    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

    // Send notification to admins
    try {
      const admins = await getAdminUsers();
      const notificationTitle = 'New Ticket Created';
      const notificationBody = `${createdBy} created a ${getPriorityLabel(priority)} priority ${getCategoryLabel(category)} ticket: ${subject}`;
      
      for (const admin of admins) {
        await createNotification(
          admin.username,
          notificationTitle,
          notificationBody,
          'ticket_created',
          {
            ticketId,
            createdBy,
            category,
            priority,
            subject,
            // Navigation data
            navigation: {
              screen: 'TicketManagement',
              params: {
                user: admin,
                ticketId: ticketId
              }
            }
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending notification to admins:', notifError);
    }

    console.log(`Ticket created: ${ticketId}`);
    return {
      success: true,
      ticketId: ticketId
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return {
      success: false,
      error: error.message || 'Failed to create ticket'
    };
  }
};

/**
 * Get all tickets for a user (created by them)
 * @param {string} username - Username
 * @returns {Promise<Array>} Array of tickets
 */
export const getUserTickets = async (username) => {
  try {
    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    return allTickets.filter(ticket => ticket.createdBy === username);
  } catch (error) {
    console.error('Error getting user tickets:', error);
    return [];
  }
};

/**
 * Get all tickets (for admin)
 * @returns {Promise<Array>} Array of all tickets
 */
export const getAllTickets = async () => {
  try {
    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    return ticketsJson ? JSON.parse(ticketsJson) : [];
  } catch (error) {
    console.error('Error getting all tickets:', error);
    return [];
  }
};

/**
 * Get ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object|null>} Ticket object or null
 */
export const getTicketById = async (ticketId) => {
  try {
    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    return allTickets.find(ticket => ticket.id === ticketId) || null;
  } catch (error) {
    console.error('Error getting ticket by ID:', error);
    return null;
  }
};

/**
 * Update ticket status
 * @param {string} ticketId - Ticket ID
 * @param {string} status - New status
 * @param {string} updatedBy - Username who updated
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateTicketStatus = async (ticketId, status, updatedBy) => {
  try {
    if (!Object.values(TICKET_STATUS).includes(status)) {
      return {
        success: false,
        error: 'Invalid ticket status'
      };
    }

    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    const ticketIndex = allTickets.findIndex(ticket => ticket.id === ticketId);
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    const ticket = allTickets[ticketIndex];
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();

    if (status === TICKET_STATUS.RESOLVED) {
      ticket.resolvedAt = new Date().toISOString();
    } else if (status === TICKET_STATUS.CLOSED) {
      ticket.closedAt = new Date().toISOString();
    }

    allTickets[ticketIndex] = ticket;
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

    // Send notification to ticket creator
    try {
      const notificationTitle = 'Ticket Status Updated';
      const notificationBody = `Your ticket "${ticket.subject}" has been ${getStatusLabel(status).toLowerCase()}`;
      
      await createNotification(
        ticket.createdBy,
        notificationTitle,
        notificationBody,
        'ticket_updated',
        {
          ticketId,
          status,
          subject: ticket.subject,
          // Navigation data
          navigation: {
            screen: 'TicketScreen',
            params: {
              user: { username: ticket.createdBy },
              ticketId: ticketId
            }
          }
        }
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return {
      success: false,
      error: error.message || 'Failed to update ticket status'
    };
  }
};

/**
 * Assign ticket to admin
 * @param {string} ticketId - Ticket ID
 * @param {string} assignedTo - Username of admin to assign to
 * @param {string} assignedBy - Username who assigned
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const assignTicket = async (ticketId, assignedTo, assignedBy) => {
  try {
    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    const ticketIndex = allTickets.findIndex(ticket => ticket.id === ticketId);
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    const ticket = allTickets[ticketIndex];
    ticket.assignedTo = assignedTo;
    ticket.updatedAt = new Date().toISOString();

    // If status is open, change to in progress
    if (ticket.status === TICKET_STATUS.OPEN) {
      ticket.status = TICKET_STATUS.IN_PROGRESS;
    }

    allTickets[ticketIndex] = ticket;
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

    // Send notification to assigned admin
    try {
      const notificationTitle = 'Ticket Assigned';
      const notificationBody = `You have been assigned a ${getPriorityLabel(ticket.priority)} priority ticket: ${ticket.subject}`;
      
      await createNotification(
        assignedTo,
        notificationTitle,
        notificationBody,
        'ticket_assigned',
        {
          ticketId,
          priority: ticket.priority,
          subject: ticket.subject,
          // Navigation data
          navigation: {
            screen: 'TicketManagement',
            params: {
              user: { username: assignedTo },
              ticketId: ticketId
            }
          }
        }
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign ticket'
    };
  }
};

/**
 * Add response to ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} respondedBy - Username who responded
 * @param {string} message - Response message
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const addTicketResponse = async (ticketId, respondedBy, message) => {
  try {
    if (!message.trim()) {
      return {
        success: false,
        error: 'Response message is required'
      };
    }

    const ticketsJson = await AsyncStorage.getItem(TICKETS_KEY);
    const allTickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    const ticketIndex = allTickets.findIndex(ticket => ticket.id === ticketId);
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    const ticket = allTickets[ticketIndex];
    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      respondedBy,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    ticket.responses = ticket.responses || [];
    ticket.responses.push(response);
    ticket.updatedAt = new Date().toISOString();

    allTickets[ticketIndex] = ticket;
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

    // Send notification
    try {
      const notificationTitle = 'New Response on Ticket';
      const notificationBody = `${respondedBy} responded to ticket: ${ticket.subject}`;
      
      // Notify ticket creator if not the one responding
      if (respondedBy !== ticket.createdBy) {
        await createNotification(
          ticket.createdBy,
          notificationTitle,
          notificationBody,
          'ticket_response',
          {
            ticketId,
            subject: ticket.subject,
            respondedBy
          }
        );
      }

      // Notify assigned admin if different from responder
      if (ticket.assignedTo && ticket.assignedTo !== respondedBy && ticket.assignedTo !== ticket.createdBy) {
        await createNotification(
          ticket.assignedTo,
          notificationTitle,
          notificationBody,
          'ticket_response',
          {
            ticketId,
            subject: ticket.subject,
            respondedBy,
            // Navigation data
            navigation: {
              screen: 'TicketManagement',
              params: {
                user: { username: ticket.assignedTo },
                ticketId: ticketId
              }
            }
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding ticket response:', error);
    return {
      success: false,
      error: error.message || 'Failed to add response'
    };
  }
};

/**
 * Get tickets by status
 * @param {string} status - Ticket status
 * @returns {Promise<Array>} Array of tickets with the specified status
 */
export const getTicketsByStatus = async (status) => {
  try {
    const allTickets = await getAllTickets();
    return allTickets.filter(ticket => ticket.status === status);
  } catch (error) {
    console.error('Error getting tickets by status:', error);
    return [];
  }
};

/**
 * Get tickets by category
 * @param {string} category - Ticket category
 * @returns {Promise<Array>} Array of tickets with the specified category
 */
export const getTicketsByCategory = async (category) => {
  try {
    const allTickets = await getAllTickets();
    return allTickets.filter(ticket => ticket.category === category);
  } catch (error) {
    console.error('Error getting tickets by category:', error);
    return [];
  }
};

/**
 * Get tickets assigned to a user
 * @param {string} username - Username
 * @returns {Promise<Array>} Array of tickets assigned to the user
 */
export const getAssignedTickets = async (username) => {
  try {
    const allTickets = await getAllTickets();
    return allTickets.filter(ticket => ticket.assignedTo === username);
  } catch (error) {
    console.error('Error getting assigned tickets:', error);
    return [];
  }
};




