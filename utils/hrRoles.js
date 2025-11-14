// HR Role Management Utilities
// Maps positions to HR roles and provides role management functions

// Default mapping of positions to HR roles
const POSITION_TO_ROLE_MAP = {
  // Engineering roles
  'Software Developer': 'Associate',
  'Senior Developer': 'Senior Associate',
  'DevOps Engineer': 'Senior Associate',
  'Software Engineer': 'Associate',
  'Senior Software Engineer': 'Senior Associate',
  'Lead Developer': 'Lead Associate',
  'Tech Lead': 'Lead Associate',
  'Engineering Manager': 'Manager',
  
  // Design roles
  'UI/UX Designer': 'Associate',
  'Senior Designer': 'Senior Associate',
  'Design Lead': 'Lead Associate',
  
  // Management roles
  'System Administrator': 'Manager',
  'Operations Manager': 'Manager',
  'Project Manager': 'Manager',
  'Sales Manager': 'Manager',
  'HR Coordinator': 'Associate',
  'HR Manager': 'Manager',
  
  // Sales roles
  'Sales Representative': 'Associate',
  'Senior Sales Representative': 'Senior Associate',
  'Sales Executive': 'Senior Associate',
  
  // Marketing roles
  'Marketing Specialist': 'Associate',
  'Senior Marketing Specialist': 'Senior Associate',
  'Marketing Manager': 'Manager',
  
  // AI/ML roles
  'AI Engineer': 'Associate',
  'Senior AI Engineer': 'Senior Associate',
  'ML Engineer': 'Associate',
  'Senior ML Engineer': 'Senior Associate',
  'Data Scientist': 'Associate',
  'Senior Data Scientist': 'Senior Associate',
  'AI Researcher': 'Senior Associate',
  
  // Intern roles
  'Intern': 'Intern',
  'Software Development Intern': 'Intern',
  'Design Intern': 'Intern',
  'Marketing Intern': 'Intern',
  'AI Intern': 'Intern',
  
  // Other common roles
  'Analyst': 'Associate',
  'Senior Analyst': 'Senior Associate',
  'Consultant': 'Associate',
  'Senior Consultant': 'Senior Associate',
};

// Available HR role levels
export const HR_ROLES = {
  INTERN: 'Intern',
  ASSOCIATE: 'Associate',
  SENIOR_ASSOCIATE: 'Senior Associate',
  LEAD_ASSOCIATE: 'Lead Associate',
  MANAGER: 'Manager',
  SENIOR_MANAGER: 'Senior Manager',
  DIRECTOR: 'Director',
  VP: 'VP',
  C_LEVEL: 'C-Level'
};

// All available HR roles as array
export const HR_ROLE_LIST = [
  HR_ROLES.INTERN,
  HR_ROLES.ASSOCIATE,
  HR_ROLES.SENIOR_ASSOCIATE,
  HR_ROLES.LEAD_ASSOCIATE,
  HR_ROLES.MANAGER,
  HR_ROLES.SENIOR_MANAGER,
  HR_ROLES.DIRECTOR,
  HR_ROLES.VP,
  HR_ROLES.C_LEVEL
];

/**
 * Get HR role from position
 * @param {string} position - Employee position
 * @returns {string} HR role
 */
export const getHRRoleFromPosition = (position) => {
  if (!position) return HR_ROLES.ASSOCIATE;
  return POSITION_TO_ROLE_MAP[position] || HR_ROLES.ASSOCIATE;
};

/**
 * Get HR role color for display
 * @param {string} hrRole - HR role
 * @returns {string} Color code
 */
export const getHRRoleColor = (hrRole) => {
  switch (hrRole) {
    case HR_ROLES.INTERN:
      return '#94a3b8'; // Gray
    case HR_ROLES.ASSOCIATE:
      return '#3b82f6'; // Blue
    case HR_ROLES.SENIOR_ASSOCIATE:
      return '#10b981'; // Green
    case HR_ROLES.LEAD_ASSOCIATE:
      return '#8b5cf6'; // Purple
    case HR_ROLES.MANAGER:
      return '#f59e0b'; // Amber
    case HR_ROLES.SENIOR_MANAGER:
      return '#ef4444'; // Red
    case HR_ROLES.DIRECTOR:
      return '#ec4899'; // Pink
    case HR_ROLES.VP:
      return '#6366f1'; // Indigo
    case HR_ROLES.C_LEVEL:
      return '#1f2937'; // Dark gray
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Get HR role icon
 * @param {string} hrRole - HR role
 * @returns {string} Icon name
 */
export const getHRRoleIcon = (hrRole) => {
  switch (hrRole) {
    case HR_ROLES.INTERN:
      return 'school-outline';
    case HR_ROLES.ASSOCIATE:
      return 'person-outline';
    case HR_ROLES.SENIOR_ASSOCIATE:
      return 'person';
    case HR_ROLES.LEAD_ASSOCIATE:
      return 'star-outline';
    case HR_ROLES.MANAGER:
      return 'briefcase-outline';
    case HR_ROLES.SENIOR_MANAGER:
      return 'briefcase';
    case HR_ROLES.DIRECTOR:
      return 'trophy-outline';
    case HR_ROLES.VP:
      return 'medal-outline';
    case HR_ROLES.C_LEVEL:
      return 'diamond-outline';
    default:
      return 'person-outline';
  }
};

/**
 * Get HR role label (formatted)
 * @param {string} hrRole - HR role
 * @returns {string} Formatted label
 */
export const getHRRoleLabel = (hrRole) => {
  return hrRole || 'Associate';
};

/**
 * Check if HR role is valid
 * @param {string} hrRole - HR role to validate
 * @returns {boolean} Whether role is valid
 */
export const isValidHRRole = (hrRole) => {
  return HR_ROLE_LIST.includes(hrRole);
};

