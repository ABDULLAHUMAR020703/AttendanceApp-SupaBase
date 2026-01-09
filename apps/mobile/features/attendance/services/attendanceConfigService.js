/**
 * Attendance Configuration Service
 * Manages global attendance settings like auto_checkout_enabled
 */
import { supabase } from '../../../core/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_CACHE_KEY = '@attendance_config_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get attendance configuration from database
 * @param {string} configKey - Configuration key (e.g., 'auto_checkout_enabled')
 * @param {boolean} useCache - Whether to use cached value (default: true)
 * @returns {Promise<Object|null>} Configuration value or null
 */
export const getAttendanceConfig = async (configKey, useCache = true) => {
  try {
    // Check cache first
    if (useCache) {
      const cached = await getCachedConfig(configKey);
      if (cached) {
        console.log(`[AttendanceConfig] Using cached config for ${configKey}:`, cached);
        return cached;
      }
    }

    // Fetch from database
    const { data, error } = await supabase.rpc('get_attendance_config', {
      p_config_key: configKey,
    });

    if (error) {
      console.error(`[AttendanceConfig] Error getting config ${configKey}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`[AttendanceConfig] Config ${configKey} not found`);
      return null;
    }

    // Cache the result
    await cacheConfig(configKey, data);

    return data;
  } catch (error) {
    console.error(`[AttendanceConfig] Exception getting config ${configKey}:`, error);
    return null;
  }
};

/**
 * Get auto_checkout_enabled flag
 * @param {boolean} useCache - Whether to use cached value
 * @returns {Promise<boolean>} True if auto checkout is enabled
 */
export const isAutoCheckoutEnabled = async (useCache = true) => {
  try {
    const config = await getAttendanceConfig('auto_checkout_enabled', useCache);
    if (!config) {
      return false; // Default to false if config not found
    }
    return config.enabled === true;
  } catch (error) {
    console.error('[AttendanceConfig] Error checking auto checkout enabled:', error);
    return false; // Default to false on error
  }
};

/**
 * Set attendance configuration (super_admin only)
 * @param {string} configKey - Configuration key
 * @param {Object} configValue - Configuration value (will be stored as JSONB)
 * @param {string} description - Optional description
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const setAttendanceConfig = async (configKey, configValue, description = null) => {
  try {
    console.log(`[AttendanceConfig] Setting config ${configKey}:`, configValue);

    const { data, error } = await supabase.rpc('set_attendance_config', {
      p_config_key: configKey,
      p_config_value: configValue,
      p_description: description,
    });

    if (error) {
      console.error(`[AttendanceConfig] Error setting config ${configKey}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to update configuration',
      };
    }

    // Clear cache to force refresh
    await clearConfigCache(configKey);

    console.log(`[AttendanceConfig] ✓ Config ${configKey} updated successfully`);
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[AttendanceConfig] Exception setting config ${configKey}:`, error);
    return {
      success: false,
      error: error.message || 'Failed to update configuration',
    };
  }
};

/**
 * Set auto_checkout_enabled flag (super_admin only)
 * @param {boolean} enabled - Whether to enable auto checkout
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const setAutoCheckoutEnabled = async (enabled) => {
  return await setAttendanceConfig(
    'auto_checkout_enabled',
    { enabled },
    'Enable automatic checkout when employee leaves 1km office radius'
  );
};

/**
 * Cache configuration value
 */
const cacheConfig = async (configKey, value) => {
  try {
    const cacheData = {
      value,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      `${CONFIG_CACHE_KEY}_${configKey}`,
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.warn('[AttendanceConfig] Error caching config:', error);
  }
};

/**
 * Get cached configuration value
 */
const getCachedConfig = async (configKey) => {
  try {
    const cached = await AsyncStorage.getItem(`${CONFIG_CACHE_KEY}_${configKey}`);
    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;

    // Check if cache is still valid
    if (age > CACHE_TTL) {
      await AsyncStorage.removeItem(`${CONFIG_CACHE_KEY}_${configKey}`);
      return null;
    }

    return cacheData.value;
  } catch (error) {
    console.warn('[AttendanceConfig] Error reading cached config:', error);
    return null;
  }
};

/**
 * Clear configuration cache
 */
const clearConfigCache = async (configKey) => {
  try {
    await AsyncStorage.removeItem(`${CONFIG_CACHE_KEY}_${configKey}`);
  } catch (error) {
    console.warn('[AttendanceConfig] Error clearing cache:', error);
  }
};

/**
 * Clear all configuration caches
 */
export const clearAllConfigCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const configKeys = keys.filter(key => key.startsWith(CONFIG_CACHE_KEY));
    await AsyncStorage.multiRemove(configKeys);
    console.log('[AttendanceConfig] All config caches cleared');
  } catch (error) {
    console.warn('[AttendanceConfig] Error clearing all caches:', error);
  }
};
