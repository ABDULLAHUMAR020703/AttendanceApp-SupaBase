// Work mode constants and utilities
export const WORK_MODES = {
  IN_OFFICE: 'in_office',
  SEMI_REMOTE: 'semi_remote',
  FULLY_REMOTE: 'fully_remote'
};

export const WORK_MODE_LABELS = {
  [WORK_MODES.IN_OFFICE]: 'In Office',
  [WORK_MODES.SEMI_REMOTE]: 'Semi Remote',
  [WORK_MODES.FULLY_REMOTE]: 'Fully Remote'
};

export const WORK_MODE_DESCRIPTIONS = {
  [WORK_MODES.IN_OFFICE]: 'Employee must work from office location',
  [WORK_MODES.SEMI_REMOTE]: 'Employee can work from home or office',
  [WORK_MODES.FULLY_REMOTE]: 'Employee works remotely from any location'
};

export const WORK_MODE_COLORS = {
  [WORK_MODES.IN_OFFICE]: '#3b82f6', // Blue
  [WORK_MODES.SEMI_REMOTE]: '#f59e0b', // Amber
  [WORK_MODES.FULLY_REMOTE]: '#10b981' // Emerald
};

export const WORK_MODE_ICONS = {
  [WORK_MODES.IN_OFFICE]: 'business',
  [WORK_MODES.SEMI_REMOTE]: 'swap-horizontal',
  [WORK_MODES.FULLY_REMOTE]: 'home'
};

/**
 * Get work mode label
 * @param {string} workMode - Work mode constant
 * @returns {string} Human-readable label
 */
export const getWorkModeLabel = (workMode) => {
  return WORK_MODE_LABELS[workMode] || 'Unknown';
};

/**
 * Get work mode description
 * @param {string} workMode - Work mode constant
 * @returns {string} Description
 */
export const getWorkModeDescription = (workMode) => {
  return WORK_MODE_DESCRIPTIONS[workMode] || 'Unknown work mode';
};

/**
 * Get work mode color
 * @param {string} workMode - Work mode constant
 * @returns {string} Hex color code
 */
export const getWorkModeColor = (workMode) => {
  return WORK_MODE_COLORS[workMode] || '#6b7280';
};

/**
 * Get work mode icon
 * @param {string} workMode - Work mode constant
 * @returns {string} Icon name
 */
export const getWorkModeIcon = (workMode) => {
  return WORK_MODE_ICONS[workMode] || 'help-circle';
};

/**
 * Validate work mode
 * @param {string} workMode - Work mode to validate
 * @returns {boolean} Is valid work mode
 */
export const isValidWorkMode = (workMode) => {
  return Object.values(WORK_MODES).includes(workMode);
};

/**
 * Get all work modes as array
 * @returns {Array} Array of work mode objects
 */
export const getAllWorkModes = () => {
  return Object.values(WORK_MODES).map(mode => ({
    value: mode,
    label: getWorkModeLabel(mode),
    description: getWorkModeDescription(mode),
    color: getWorkModeColor(mode),
    icon: getWorkModeIcon(mode)
  }));
};
