/**
 * GeoFencing Screen
 * Screen for managing office location with interactive map
 * Uses OpenStreetMap (default provider) via react-native-maps
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useTheme } from '../../../core/contexts/ThemeContext';
import { getOfficeLocation, updateOfficeLocation, canUpdateOfficeLocation } from '../services/geofenceService';
import { formatDistance } from '../utils/distance';
import { reverseGeocode, cancelReverseGeocode } from '../utils/reverseGeocoding';
import { spacing } from '../../../utils/responsive';
import { isHRAdmin } from '../../../shared/constants/roles';

export default function GeoFencingScreen({ navigation, route }) {
  const { user } = route.params || {};
  const { colors } = useTheme();
  const mapRef = useRef(null);

  const [officeLocation, setOfficeLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false); // Track if marker is locked (dragging disabled)
  const [locationName, setLocationName] = useState('Unknown location'); // Human-readable location name
  const [isResolvingLocation, setIsResolvingLocation] = useState(false); // Loading state for reverse geocoding
  const [region, setRegion] = useState({
    latitude: -6.2088, // Default: Jakarta, Indonesia
    longitude: 106.8456,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Check if user can edit
  const canEdit = canUpdateOfficeLocation(user);
  const isReadOnly = !canEdit;

  // Load office location on mount
  useEffect(() => {
    loadOfficeLocation();

    // Cleanup: cancel pending geocoding on unmount
    return () => {
      cancelReverseGeocode();
    };
  }, []);

  /**
   * Resolve location name from coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   */
  const resolveLocationName = async (latitude, longitude) => {
    try {
      setIsResolvingLocation(true);
      console.log('[GeoFencingScreen] Resolving location name for:', {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      });

      const name = await reverseGeocode(latitude, longitude, 600); // 600ms debounce
      setLocationName(name);

      console.log('[GeoFencingScreen] Location name resolved:', name);
    } catch (err) {
      console.error('[GeoFencingScreen] Error resolving location name:', err);
      setLocationName('Unknown location');
    } finally {
      setIsResolvingLocation(false);
    }
  };

  /**
   * Load office location from database or initialize from GPS if not exists
   * This is the ONLY place where GPS is called automatically (on initial load if DB is empty)
   */
  const loadOfficeLocation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[GeoFencingScreen] Loading office location from database...');
      const location = await getOfficeLocation();

      if (location) {
        // Office location exists in DB - use it as source of truth
        console.log('[GeoFencingScreen] Office location found in DB:', {
          latitude: location.latitude.toFixed(6),
          longitude: location.longitude.toFixed(6),
        });
        
        setOfficeLocation(location);
        // Update map region to center on office location
        setRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        // If location exists in database, marker should be locked by default
        setIsLocked(true);
        
        // Resolve location name from coordinates
        await resolveLocationName(location.latitude, location.longitude);
      } else {
        // No office location set in DB - initialize from GPS ONCE
        console.log('[GeoFencingScreen] No office location in DB, initializing from GPS...');
        
        try {
          const { getCurrentLocation } = await import('../services/geofenceService');
          const gpsLocation = await getCurrentLocation();

          if (gpsLocation) {
            console.log('[GeoFencingScreen] GPS location obtained:', {
              latitude: gpsLocation.latitude.toFixed(6),
              longitude: gpsLocation.longitude.toFixed(6),
            });

            const initialLocation = {
              id: 'office_location',
              latitude: gpsLocation.latitude,
              longitude: gpsLocation.longitude,
              radius_meters: 1000,
            };

            setOfficeLocation(initialLocation);
            setRegion({
              latitude: gpsLocation.latitude,
              longitude: gpsLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setIsLocked(false); // Unlocked so user can adjust before saving

            // Resolve location name from GPS coordinates
            await resolveLocationName(gpsLocation.latitude, gpsLocation.longitude);
          } else {
            // GPS failed - use default region
            console.warn('[GeoFencingScreen] GPS location unavailable, using default region');
            setOfficeLocation(null);
            setIsLocked(false);
            setLocationName('Unknown location');
          }
        } catch (gpsError) {
          console.error('[GeoFencingScreen] Error getting GPS location:', gpsError);
          // GPS failed - use default region
          setOfficeLocation(null);
          setIsLocked(false);
          setLocationName('Unknown location');
        }
      }
    } catch (err) {
      console.error('[GeoFencingScreen] Error loading office location:', err);
      setError(err.message || 'Failed to load office location');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle marker drag end - updates officeLocation state (single source of truth)
   * This is the ONLY way marker position changes via dragging
   */
  const handleMarkerDragEnd = async (event) => {
    if (isReadOnly || isLocked) {
      console.log('[GeoFencingScreen] Marker drag ignored (read-only or locked)');
      return; // Don't allow dragging in read-only mode or when locked
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    console.log('[GeoFencingScreen] Marker drag ended - updating officeLocation state:', {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      previousLatitude: officeLocation?.latitude?.toFixed(6),
      previousLongitude: officeLocation?.longitude?.toFixed(6),
    });

    // Update officeLocation state (single source of truth)
    const newLocation = {
      ...officeLocation,
      latitude,
      longitude,
    };

    // Update state - this will trigger marker re-render at new position
    setOfficeLocation(newLocation);

    // Update region to center on new location
    setRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    // Resolve location name from new coordinates (debounced)
    await resolveLocationName(latitude, longitude);
    
    console.log('[GeoFencingScreen] Marker position updated in state:', {
      latitude: newLocation.latitude.toFixed(6),
      longitude: newLocation.longitude.toFixed(6),
    });
  };

  const handleSaveLocation = async () => {
    if (isReadOnly || !officeLocation) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const result = await updateOfficeLocation(
        officeLocation.latitude,
        officeLocation.longitude,
        officeLocation.radius_meters || 1000,
        user
      );

      if (result.success) {
        Alert.alert('Success', 'Office location updated successfully');
        await loadOfficeLocation();
      } else {
        setError(result.error || 'Failed to update office location');
        Alert.alert('Error', result.error || 'Failed to update office location');
        // Reload to get correct location
        await loadOfficeLocation();
      }
    } catch (err) {
      console.error('[GeoFencingScreen] Error saving location:', err);
      setError(err.message || 'Failed to save location');
      Alert.alert('Error', err.message || 'Failed to save location');
      // Reload to get correct location
      await loadOfficeLocation();
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle "Use Current Location" button - explicitly fetches GPS ONCE and updates officeLocation state
   * This is the ONLY way GPS is called after initial load (user-initiated)
   */
  const handleUseCurrentLocation = async () => {
    if (isReadOnly) {
      Alert.alert('Read Only', 'You do not have permission to update the office location.');
      return;
    }

    console.log('[GeoFencingScreen] "Use Current Location" button pressed - fetching GPS...');

    try {
      const { getCurrentLocation } = await import('../services/geofenceService');
      const gpsLocation = await getCurrentLocation();

      if (gpsLocation) {
        console.log('[GeoFencingScreen] GPS location obtained via button:', {
          latitude: gpsLocation.latitude.toFixed(6),
          longitude: gpsLocation.longitude.toFixed(6),
          previousLatitude: officeLocation?.latitude?.toFixed(6),
          previousLongitude: officeLocation?.longitude?.toFixed(6),
        });

        // Update officeLocation state (single source of truth) with GPS coordinates
        const newLocation = {
          id: officeLocation?.id || 'office_location',
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          radius_meters: 1000, // Always use 1000m
          updated_by: user?.username,
          updated_at: new Date().toISOString(),
        };

        // Update state - this will trigger marker to snap to GPS position
        setOfficeLocation(newLocation);
        
        // Re-center map to new marker position
        setRegion({
          latitude: gpsLocation.latitude,
          longitude: gpsLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        // Resolve location name from GPS coordinates
        await resolveLocationName(gpsLocation.latitude, gpsLocation.longitude);

        // Unlock marker when using current location (allows dragging before locking)
        setIsLocked(false);

        console.log('[GeoFencingScreen] Marker snapped to GPS location:', {
          latitude: newLocation.latitude.toFixed(6),
          longitude: newLocation.longitude.toFixed(6),
        });
      } else {
        console.warn('[GeoFencingScreen] GPS location unavailable');
        Alert.alert('Error', 'Could not get current location. Please enable location services.');
      }
    } catch (err) {
      console.error('[GeoFencingScreen] Error getting current location:', err);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  /**
   * Handle "Lock Office Location" - persists officeLocation state to database
   * Does NOT call GPS - only saves current state
   */
  const handleLockLocation = async () => {
    if (isReadOnly || !officeLocation) {
      console.warn('[GeoFencingScreen] handleLockLocation: Read-only or no location');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      console.log('[GeoFencingScreen] Locking location - saving officeLocation state to DB:', {
        latitude: officeLocation.latitude.toFixed(6),
        longitude: officeLocation.longitude.toFixed(6),
        radius: 1000,
        locationName,
        user: user?.username,
        userRole: user?.role,
      });

      // Save current officeLocation state (marker position) to database
      // Do NOT call GPS - only persist what's in state
      const result = await updateOfficeLocation(
        officeLocation.latitude,
        officeLocation.longitude,
        1000, // Always save as 1000m
        user
      );

      console.log('[GeoFencingScreen] Update result:', result);
      console.log('[GeoFencingScreen] Final payload sent to Supabase:', {
        latitude: officeLocation.latitude.toFixed(6),
        longitude: officeLocation.longitude.toFixed(6),
        radius_meters: 1000,
        locationName,
      });

      if (result.success) {
        console.log('[GeoFencingScreen] Location locked successfully');
        // Disable marker dragging
        setIsLocked(true);
        
        // Update office location with saved data
        if (result.location) {
          setOfficeLocation(result.location);
        } else {
          // Update radius to 1000m
          setOfficeLocation({
            ...officeLocation,
            radius_meters: 1000,
          });
        }

        // Show success feedback
        Alert.alert('Success', 'Office location saved and locked', [
          {
            text: 'OK',
            onPress: () => {
              // Reload to get latest data
              loadOfficeLocation();
            },
          },
        ]);
      } else {
        const errorMsg = result.error || 'Failed to lock location';
        console.error('[GeoFencingScreen] Failed to lock location:', errorMsg);
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
        // Reload to get correct location
        await loadOfficeLocation();
      }
    } catch (err) {
      console.error('[GeoFencingScreen] Exception locking location:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      const errorMsg = err.message || 'Failed to lock location';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      // Reload to get correct location
      await loadOfficeLocation();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockLocation = () => {
    if (isReadOnly) {
      return;
    }
    setIsLocked(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      padding: 16,
      paddingTop: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
    },
    mapContainer: {
      flex: 1,
      height: 400,
    },
    map: {
      flex: 1,
    },
    controlsContainer: {
      backgroundColor: colors.card,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    readOnlyBadge: {
      backgroundColor: '#f59e0b',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 12,
    },
    readOnlyText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    buttonDisabled: {
      backgroundColor: colors.border,
      opacity: 0.5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonSecondary: {
      backgroundColor: colors.border,
    },
    buttonSecondaryText: {
      color: colors.text,
    },
    errorText: {
      color: '#ef4444',
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      backgroundColor: colors.background,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Office Location</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Loading office location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Office Location</Text>
        <TouchableOpacity onPress={loadOfficeLocation}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadOfficeLocation} />}
      >
        {/* Map Container */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            region={region}
            onRegionChangeComplete={setRegion}
            mapType="standard"
            // Use default provider (OpenStreetMap) - no provider prop needed
          >
            {officeLocation && (
              <>
                {/* Red draggable marker */}
                <Marker
                  coordinate={{
                    latitude: officeLocation.latitude,
                    longitude: officeLocation.longitude,
                  }}
                  draggable={canEdit && !isLocked}
                  onDragEnd={handleMarkerDragEnd}
                  pinColor="#ef4444" // Red color
                  title="Office Location"
                  description={`Radius: ${formatDistance(officeLocation.radius_meters || 1000)}${isLocked ? ' (Locked)' : ''}`}
                />

                {/* 1km radius circle (always 1000m) */}
                <Circle
                  center={{
                    latitude: officeLocation.latitude,
                    longitude: officeLocation.longitude,
                  }}
                  radius={1000} // Always 1000m = 1km
                  strokeColor="#ef4444"
                  fillColor="rgba(239, 68, 68, 0.2)"
                  strokeWidth={2}
                />
              </>
            )}
          </MapView>
        </View>

        {/* Info Card */}
        <View style={styles.controlsContainer}>
          {isReadOnly && (
            <View style={styles.readOnlyBadge}>
              <Text style={styles.readOnlyText}>Read Only - You can view but not edit</Text>
            </View>
          )}

          {officeLocation ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Office Location</Text>

              {/* Location Name */}
              <View style={[styles.infoRow, { marginBottom: spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs / 2 }}>
                    {isResolvingLocation ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.xs }} />
                        <Text style={[styles.infoValue, { fontStyle: 'italic' }]}>Resolving location...</Text>
                      </>
                    ) : (
                      <Text style={[styles.infoValue, { flex: 1 }]} numberOfLines={2}>
                        {locationName}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Latitude</Text>
                <Text style={styles.infoValue}>{officeLocation.latitude.toFixed(6)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Longitude</Text>
                <Text style={styles.infoValue}>{officeLocation.longitude.toFixed(6)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Radius</Text>
                <Text style={styles.infoValue}>
                  {formatDistance(1000)} {/* Always 1000m */}
                </Text>
              </View>

              {isLocked && (
                <View style={styles.infoRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="lock-closed" size={16} color="#10b981" />
                    <Text style={[styles.infoLabel, { color: '#10b981' }]}>Location Locked</Text>
                  </View>
                </View>
              )}

              {officeLocation.updated_by && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Updated By</Text>
                  <Text style={styles.infoValue}>{officeLocation.updated_by}</Text>
                </View>
              )}

              {officeLocation.updated_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Updated</Text>
                  <Text style={styles.infoValue}>
                    {new Date(officeLocation.updated_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No office location set</Text>
                <Text style={styles.emptyStateText}>
                  {canEdit
                    ? 'Use "Set Current Location" to set the office location'
                    : 'Contact an administrator to set the office location'}
                </Text>
              </View>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Action Buttons */}
          {canEdit && (
            <>
              <TouchableOpacity
                style={styles.button}
                onPress={handleUseCurrentLocation}
                disabled={isSaving}
              >
                <Ionicons name="locate" size={20} color="#fff" />
                <Text style={styles.buttonText}>Use Current Location</Text>
              </TouchableOpacity>

              {officeLocation && (
                <>
                  {isLocked ? (
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={handleUnlockLocation}
                      disabled={isSaving}
                    >
                      <Ionicons name="lock-open" size={20} color={colors.text} />
                      <Text style={styles.buttonSecondaryText}>Unlock to Edit</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, isSaving && styles.buttonDisabled]}
                      onPress={handleLockLocation}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.buttonText}>Saving...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="lock-closed" size={20} color="#fff" />
                          <Text style={styles.buttonText}>Lock Location</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}

          {!canEdit && officeLocation && (
            <View style={[styles.button, styles.buttonSecondary]}>
              <Ionicons name="lock-closed" size={20} color={colors.text} />
              <Text style={styles.buttonSecondaryText}>
                Only Super Admin and HR can edit
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
