import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { 
  getAttendanceRecords, 
  createManualAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord
} from '../utils/storage';
import { getEmployees, getManageableEmployees, canManageEmployee } from '../utils/employees';
import DatePickerCalendar from '../components/DatePickerCalendar';

export default function ManualAttendanceScreen({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceType, setAttendanceType] = useState('checkin');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    await Promise.all([
      loadEmployees(),
      loadAttendanceRecords()
    ]);
  };

  const loadEmployees = async () => {
    try {
      const manageableEmployees = await getManageableEmployees(user);
      setEmployees(manageableEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const records = await getAttendanceRecords();
      // Sort by timestamp (newest first)
      const sorted = records.sort((a, b) => 
        new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
      );
      setAttendanceRecords(sorted);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const handleAddAttendance = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Error', 'Please enter a time (HH:MM format)');
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(selectedTime)) {
      Alert.alert('Error', 'Invalid time format. Use HH:MM (e.g., 09:30)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':');
      const dateTime = new Date(selectedDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const result = await createManualAttendanceRecord(
        {
          username: selectedEmployee.username,
          type: attendanceType,
          timestamp: dateTime.toISOString(),
          location: location || { address: 'Manual Entry' },
          authMethod: 'manual',
          employeeName: selectedEmployee.name
        },
        user.username
      );

      if (result.success) {
        Alert.alert('Success', 'Attendance record created successfully');
        setShowAddModal(false);
        resetForm();
        await loadAttendanceRecords();
      } else {
        Alert.alert('Error', result.error || 'Failed to create attendance record');
      }
    } catch (error) {
      console.error('Error creating attendance:', error);
      Alert.alert('Error', 'Failed to create attendance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAttendance = async () => {
    if (!selectedRecord) return;

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Error', 'Please enter a time (HH:MM format)');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(selectedTime)) {
      Alert.alert('Error', 'Invalid time format. Use HH:MM (e.g., 09:30)');
      return;
    }

    setIsSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const dateTime = new Date(selectedDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const result = await updateAttendanceRecord(selectedRecord.id, {
        timestamp: dateTime.toISOString(),
        type: attendanceType,
        location: location || selectedRecord.location,
        updatedBy: user.username
      });

      if (result.success) {
        Alert.alert('Success', 'Attendance record updated successfully');
        setShowEditModal(false);
        setSelectedRecord(null);
        await loadAttendanceRecords();
      } else {
        Alert.alert('Error', result.error || 'Failed to update attendance record');
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttendance = (record) => {
    Alert.alert(
      'Delete Attendance Record',
      `Are you sure you want to delete this ${record.type} record for ${record.employeeName || record.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAttendanceRecord(record.id);
              if (result.success) {
                Alert.alert('Success', 'Attendance record deleted successfully');
                await loadAttendanceRecords();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete record');
              }
            } catch (error) {
              console.error('Error deleting attendance:', error);
              Alert.alert('Error', 'Failed to delete attendance record');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setAttendanceType('checkin');
    setSelectedDate(null);
    setSelectedTime('');
    setLocation('');
  };

  const openEditModal = (record) => {
    setSelectedRecord(record);
    const employee = employees.find(emp => emp.username === record.username);
    setSelectedEmployee(employee || null);
    setAttendanceType(record.type);
    
    const recordDate = new Date(record.timestamp || record.createdAt);
    const dateStr = recordDate.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    
    const hours = String(recordDate.getHours()).padStart(2, '0');
    const minutes = String(recordDate.getMinutes()).padStart(2, '0');
    setSelectedTime(`${hours}:${minutes}`);
    
    setLocation(record.location?.address || '');
    setShowEditModal(true);
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderRecord = ({ item }) => {
    const canManage = item.username === user.username || 
      employees.some(emp => emp.username === item.username);
    
    return (
      <View style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        borderLeftWidth: 4,
        borderLeftColor: item.type === 'checkin' ? colors.success : colors.error
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
              {item.employeeName || item.username}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {item.type === 'checkin' ? 'Check In' : 'Check Out'}
            </Text>
            {item.isManual && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons name="create-outline" size={12} color={colors.warning} />
                <Text style={{ fontSize: 12, color: colors.warning, marginLeft: 4 }}>
                  Manual Entry
                </Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {formatDateTime(item.timestamp || item.createdAt)}
            </Text>
            {item.createdBy && (
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                By: {item.createdBy}
              </Text>
            )}
          </View>
        </View>
        
        {item.location?.address && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            📍 {item.location.address}
          </Text>
        )}

        {canManage && (
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => openEditModal(item)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.error,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => handleDeleteAttendance(item)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmployeeOption = (employee) => (
    <TouchableOpacity
      key={employee.id}
      style={{
        padding: 12,
        backgroundColor: selectedEmployee?.id === employee.id ? colors.primaryLight : colors.surface,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: selectedEmployee?.id === employee.id ? colors.primary : 'transparent'
      }}
      onPress={() => setSelectedEmployee(employee)}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {employee.name}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        {employee.username} • {employee.department}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8, marginRight: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
            Manual Attendance
          </Text>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8
          }}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 4 }}>Add</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Records List */}
      <FlatList
        data={attendanceRecords}
        renderItem={renderRecord}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons name="time-outline" size={64} color={colors.textTertiary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
              No attendance records
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Add manual attendance records for employees
            </Text>
          </View>
        }
      />

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                  Add Attendance Record
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Employee Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Select Employee *
                </Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {employees.map(renderEmployeeOption)}
                </ScrollView>
              </View>

              {/* Attendance Type */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Type *
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: attendanceType === 'checkin' ? colors.success : colors.background,
                      borderWidth: 2,
                      borderColor: attendanceType === 'checkin' ? colors.success : 'transparent',
                      alignItems: 'center'
                    }}
                    onPress={() => setAttendanceType('checkin')}
                  >
                    <Text style={{ color: attendanceType === 'checkin' ? 'white' : colors.text, fontWeight: '600' }}>
                      Check In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: attendanceType === 'checkout' ? colors.error : colors.background,
                      borderWidth: 2,
                      borderColor: attendanceType === 'checkout' ? colors.error : 'transparent',
                      alignItems: 'center'
                    }}
                    onPress={() => setAttendanceType('checkout')}
                  >
                    <Text style={{ color: attendanceType === 'checkout' ? 'white' : colors.text, fontWeight: '600' }}>
                      Check Out
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Date *
                </Text>
                <DatePickerCalendar
                  onDateSelect={(date) => setSelectedDate(date)}
                  selectedStartDate={selectedDate}
                  selectedEndDate={null}
                  previewDate={selectedDate}
                  allowRangeSelection={false}
                />
              </View>

              {/* Time Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Time * (HH:MM)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  placeholder="09:30"
                  placeholderTextColor={colors.textTertiary}
                  value={selectedTime}
                  onChangeText={setSelectedTime}
                  keyboardType="numeric"
                />
              </View>

              {/* Location (Optional) */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Location (Optional)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  placeholder="Enter location address"
                  placeholderTextColor={colors.textTertiary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    alignItems: 'center'
                  }}
                  onPress={handleAddAttendance}
                  disabled={isSubmitting}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                  Edit Attendance Record
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowEditModal(false);
                  setSelectedRecord(null);
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Employee Info (Read-only) */}
              {selectedEmployee && (
                <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>Employee</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {selectedEmployee.name} ({selectedEmployee.username})
                  </Text>
                </View>
              )}

              {/* Attendance Type */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Type *
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: attendanceType === 'checkin' ? colors.success : colors.background,
                      borderWidth: 2,
                      borderColor: attendanceType === 'checkin' ? colors.success : 'transparent',
                      alignItems: 'center'
                    }}
                    onPress={() => setAttendanceType('checkin')}
                  >
                    <Text style={{ color: attendanceType === 'checkin' ? 'white' : colors.text, fontWeight: '600' }}>
                      Check In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: attendanceType === 'checkout' ? colors.error : colors.background,
                      borderWidth: 2,
                      borderColor: attendanceType === 'checkout' ? colors.error : 'transparent',
                      alignItems: 'center'
                    }}
                    onPress={() => setAttendanceType('checkout')}
                  >
                    <Text style={{ color: attendanceType === 'checkout' ? 'white' : colors.text, fontWeight: '600' }}>
                      Check Out
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Date *
                </Text>
                <DatePickerCalendar
                  onDateSelect={(date) => setSelectedDate(date)}
                  selectedStartDate={selectedDate}
                  selectedEndDate={null}
                  previewDate={selectedDate}
                  allowRangeSelection={false}
                />
              </View>

              {/* Time Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Time * (HH:MM)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  placeholder="09:30"
                  placeholderTextColor={colors.textTertiary}
                  value={selectedTime}
                  onChangeText={setSelectedTime}
                  keyboardType="numeric"
                />
              </View>

              {/* Location */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Location
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  placeholder="Enter location address"
                  placeholderTextColor={colors.textTertiary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: colors.background,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setShowEditModal(false);
                    setSelectedRecord(null);
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                    alignItems: 'center'
                  }}
                  onPress={handleEditAttendance}
                  disabled={isSubmitting}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {isSubmitting ? 'Updating...' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}






