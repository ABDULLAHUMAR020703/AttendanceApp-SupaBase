// Ticket Management Utilities using Supabase
import { supabase } from '../core/config/supabase';
import { createNotification } from './notifications';
import { getAdminUsers, getSuperAdminUsers, getManagersByDepartment } from './employees';

// Ticket Categories
export const TICKET_CATEGORIES = {
  ENGINEERING: 'engineering',
  TECHNICAL: 'technical',
  HR: 'hr',
  FINANCE: 'finance',
  SALES: 'sales',
  FACILITIES: 'facilities',
  OTHER: 'other'
};

// Map ticket categories to departments
// Engineering and Technical are separate departments
export const CATEGORY_TO_DEPARTMENT_MAP = {
  [TICKET_CATEGORIES.ENGINEERING]: 'Engineering', // Routes to Engineering Manager
  [TICKET_CATEGORIES.TECHNICAL]: 'Technical',     // Routes to Technical Manager (separate department)
  [TICKET_CATEGORIES.HR]: 'HR',
  [TICKET_CATEGORIES.FINANCE]: 'Finance',
  [TICKET_CATEGORIES.SALES]: 'Sales',
  [TICKET_CATEGORIES.FACILITIES]: 'Facilities',
  [TICKET_CATEGORIES.OTHER]: null // No specific department, goes to super_admin only
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
    [TICKET_CATEGORIES.ENGINEERING]: 'Engineering',
    [TICKET_CATEGORIES.TECHNICAL]: 'Technical',
    [TICKET_CATEGORIES.HR]: 'HR',
    [TICKET_CATEGORIES.FINANCE]: 'Finance',
    [TICKET_CATEGORIES.SALES]: 'Sales',
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
 * Convert database ticket format to app format
 * @param {Object} dbTicket - Ticket from database
 * @returns {Object} Ticket in app format
 */
const convertTicketFromDb = (dbTicket) => {
  return {
    id: dbTicket.id,
    createdBy: dbTicket.created_by,
    category: dbTicket.category,
    priority: dbTicket.priority,
    subject: dbTicket.subject,
    description: dbTicket.description,
    status: dbTicket.status,
    assignedTo: dbTicket.assigned_to,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at,
    resolvedAt: dbTicket.resolved_at,
    closedAt: dbTicket.closed_at,
    responses: dbTicket.responses || []
  };
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

    // Get user UID for database reference
    // MUST use auth.uid() from current Supabase session for RLS policy to work
    // RLS policy requires: created_by_uid = auth.uid()
    let createdByUid = null;
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
        return {
          success: false,
          error: 'Unable to verify user session. Please log in again.'
        };
      }
      
      if (authUser && authUser.id) {
        createdByUid = authUser.id;
        console.log('✓ Using UID from current Supabase session (auth.uid()):', createdByUid);
      } else {
        // No active session
        console.error('No active Supabase session found');
        return {
          success: false,
          error: 'Please ensure you are logged in. Session not found.'
        };
      }
    } catch (error) {
      console.error('Error getting Supabase session:', error);
      return {
        success: false,
        error: 'Unable to verify user session. Please log in again.'
      };
    }

    // If still no UID, we cannot proceed (RLS requires it)
    if (!createdByUid) {
      console.error('Cannot create ticket: created_by_uid is required for RLS policy');
      return {
        success: false,
        error: 'Unable to verify user identity. Please ensure you are logged in correctly.'
      };
    }

    // Auto-assign to department manager based on category
    let assignedManager = null;
    const department = CATEGORY_TO_DEPARTMENT_MAP[category];
    let initialStatus = TICKET_STATUS.OPEN;
    
    console.log(`[Ticket Routing] Category: ${category}, Department: ${department || 'N/A'}`);
    
    if (department) {
      try {
        console.log(`[Ticket Routing] Looking for managers in department: ${department}`);
        const departmentManagers = await getManagersByDepartment(department);
        console.log(`[Ticket Routing] Found ${departmentManagers.length} manager(s) for ${department}:`, 
          departmentManagers.map(m => m.username));
        
        if (departmentManagers.length > 0) {
          // Direct routing: Each category maps to its own department
          // - "technical" category → Technical department → Technical Manager
          assignedManager = departmentManagers[0];
          initialStatus = TICKET_STATUS.IN_PROGRESS;
          console.log(`✓ Ticket (${category}) will be assigned to ${assignedManager.username} (${assignedManager.position || department} Manager)`);
        } else {
          console.warn(`⚠️ No manager found for department: ${department}. Ticket will not be auto-assigned.`);
          // Fallback: Try to assign to a super_admin if no manager found
          try {
            const superAdmins = await getSuperAdminUsers();
            if (superAdmins.length > 0) {
              assignedManager = superAdmins[0];
              console.log(`✓ Fallback: Assigning ticket to super_admin: ${assignedManager.username}`);
            }
          } catch (fallbackError) {
            console.error('Error getting super_admin for fallback assignment:', fallbackError);
          }
        }
      } catch (error) {
        console.error('Error finding department manager:', error);
        // Fallback: Try to assign to a super_admin on error
        try {
          const superAdmins = await getSuperAdminUsers();
          if (superAdmins.length > 0) {
            assignedManager = superAdmins[0];
            console.log(`✓ Fallback (on error): Assigning ticket to super_admin: ${assignedManager.username}`);
          }
        } catch (fallbackError) {
          console.error('Error getting super_admin for fallback assignment:', fallbackError);
        }
      }
    } else {
      console.log(`[Ticket Routing] No department mapping for category: ${category}. Assigning to super_admin.`);
      // For "other" category or unmapped categories, assign to super_admin
      try {
        const superAdmins = await getSuperAdminUsers();
        if (superAdmins.length > 0) {
          assignedManager = superAdmins[0];
          console.log(`✓ Assigning ticket to super_admin: ${assignedManager.username}`);
        }
      } catch (fallbackError) {
        console.error('Error getting super_admin for assignment:', fallbackError);
      }
    }
    
    if (assignedManager) {
      console.log(`✓ Final assignment: ${assignedManager.username} (${assignedManager.role}, ${assignedManager.department || 'N/A'})`);
    } else {
      console.warn(`⚠️ WARNING: Ticket will be created with assigned_to = null`);
    }

    // Create ticket in Supabase
    const ticketData = {
      created_by_uid: createdByUid,
      created_by: createdBy,
      category: category,
      priority: priority,
      subject: subject.trim(),
      description: description.trim(),
      status: initialStatus,
      assigned_to: assignedManager?.username || null,
      resolved_at: null,
      closed_at: null,
      responses: []
    };

    const { data: insertedTicket, error: insertError } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting ticket to Supabase:', insertError);
      return {
        success: false,
        error: insertError.message || 'Failed to create ticket in database'
      };
    }

    const ticketId = insertedTicket.id;

    // Send notification to super_admins first
    try {
      const superAdmins = await getSuperAdminUsers();
      const notificationTitle = 'New Ticket Created';
      const notificationBody = `${createdBy} created a ${getPriorityLabel(priority)} priority ${getCategoryLabel(category)} ticket: ${subject}${assignedManager ? ` (Assigned to ${assignedManager.name})` : ''}`;
      
      for (const superAdmin of superAdmins) {
        await createNotification(
          superAdmin.username,
          notificationTitle,
          notificationBody,
          'ticket_created',
          {
            ticketId,
            createdBy,
            category,
            priority,
            subject,
            assignedTo: assignedManager?.username || null,
            // Navigation data
            navigation: {
              screen: 'TicketManagement',
              params: {
                user: superAdmin,
                ticketId: ticketId
              }
            }
          }
        );
      }
    } catch (notifError) {
      console.error('Error sending notification to super admins:', notifError);
    }

    // Send notification to assigned department manager
    if (assignedManager) {
      try {
        const notificationTitle = 'Ticket Assigned to You';
        const notificationBody = `A ${getPriorityLabel(priority)} priority ${getCategoryLabel(category)} ticket has been assigned to you: ${subject}`;
        
        await createNotification(
          assignedManager.username,
          notificationTitle,
          notificationBody,
          'ticket_assigned',
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
                user: assignedManager,
                ticketId: ticketId
              }
            }
          }
        );
        console.log(`✓ Notification sent to ${assignedManager.username}`);
      } catch (notifError) {
        console.error('Error sending notification to assigned manager:', notifError);
      }
    } else {
      // If no manager found, notify all managers about unassigned ticket
      try {
        const allManagers = await getAdminUsers();
        const managers = allManagers.filter(admin => admin.role === 'manager');
        
        if (managers.length > 0) {
          const notificationTitle = 'New Unassigned Ticket';
          const notificationBody = `${createdBy} created a ${getPriorityLabel(priority)} priority ${getCategoryLabel(category)} ticket (needs assignment): ${subject}`;
          
          for (const manager of managers) {
            await createNotification(
              manager.username,
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
                    user: manager,
                    ticketId: ticketId
                  }
                }
              }
            );
          }
        }
      } catch (notifError) {
        console.error('Error sending notification to managers:', notifError);
      }
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
    // Query from Supabase
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('created_by', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user tickets from Supabase:', error);
      return [];
    }

    // Convert database format to app format
    return tickets.map(convertTicketFromDb);
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
    // Query from Supabase (RLS policies will filter based on user role)
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting all tickets from Supabase:', error);
      return [];
    }

    // Convert database format to app format
    return tickets.map(convertTicketFromDb);
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
    // Query from Supabase
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      console.error('Error getting ticket by ID from Supabase:', error);
      return null;
    }

    // Convert database format to app format
    return convertTicketFromDb(ticket);
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

    // Get the ticket from Supabase first
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    // Prepare update data
    const updateData = {
      status: status
    };

    if (status === TICKET_STATUS.RESOLVED) {
      updateData.resolved_at = new Date().toISOString();
    } else if (status === TICKET_STATUS.CLOSED) {
      updateData.closed_at = new Date().toISOString();
    }

    // Update ticket in Supabase
    const { error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket status in Supabase:', updateError);
      return {
        success: false,
        error: updateError.message || 'Failed to update ticket status'
      };
    }

    // Send notification to ticket creator
    try {
      const notificationTitle = 'Ticket Status Updated';
      const notificationBody = `Your ticket "${ticket.subject}" has been ${getStatusLabel(status).toLowerCase()}`;
      
      await createNotification(
        ticket.created_by,
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
              user: { username: ticket.created_by },
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
    // Get the ticket from Supabase first
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    // Prepare update data
    const updateData = {
      assigned_to: assignedTo
    };

    // If status is open, change to in progress
    if (ticket.status === TICKET_STATUS.OPEN) {
      updateData.status = TICKET_STATUS.IN_PROGRESS;
    }

    // Update ticket in Supabase
    const { error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error assigning ticket in Supabase:', updateError);
      return {
        success: false,
        error: updateError.message || 'Failed to assign ticket'
      };
    }

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

    // Get the ticket from Supabase first
    const { data: ticket, error: fetchError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }

    // Create new response
    const response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      respondedBy,
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    // Get existing responses and add new one
    const existingResponses = ticket.responses || [];
    const updatedResponses = [...existingResponses, response];

    // Update ticket in Supabase
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        responses: updatedResponses
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error adding ticket response in Supabase:', updateError);
      return {
        success: false,
        error: updateError.message || 'Failed to add response'
      };
    }

    // Send notification
    try {
      const notificationTitle = 'New Response on Ticket';
      const notificationBody = `${respondedBy} responded to ticket: ${ticket.subject}`;
      
      // Notify ticket creator if not the one responding
      if (respondedBy !== ticket.created_by) {
        await createNotification(
          ticket.created_by,
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
      if (ticket.assigned_to && ticket.assigned_to !== respondedBy && ticket.assigned_to !== ticket.created_by) {
        await createNotification(
          ticket.assigned_to,
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
                user: { username: ticket.assigned_to },
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
