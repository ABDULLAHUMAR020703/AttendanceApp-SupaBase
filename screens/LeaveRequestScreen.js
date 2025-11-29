import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getEmployeeLeaveBalance,
  calculateRemainingLeaves,
  createLeaveRequest,
  getEmployeeLeaveRequests
} from '../utils/leaveManagement';
import { getEmployeeByUsername } from '../utils/employees';
import DatePickerCalendar from '../components/DatePickerCalendar';

export default function LeaveRequestScreen({ navigation, route }) {
  const { user } = route.params;
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveType, setLeaveType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState('morning');
  const [selectedPreviewDate, setSelectedPreviewDate] = useState(null); // Date selected in calendar but not yet assigned

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    await Promise.all([
      loadLeaveBalance(),
      loadMyRequests(),
      loadEmployee()
    ]);
  };

  const loadEmployee = async () => {
    try {
      const emp = await getEmployeeByUsername(user.username);
      setEmployee(emp);
    } catch (error) {
      console.error('Error loading employee:', error);
    }
  };

  const loadLeaveBalance = async () => {
    try {
      if (!employee) return;
      const balance = await getEmployeeLeaveBalance(employee.id);
      setLeaveBalance(balance);
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const loadMyRequests = async () => {
    try {
      if (!employee) return;
      const requests = await getEmployeeLeaveRequests(employee.id);
      // Sort by requested date (newest first)
      const sorted = requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      setMyRequests(sorted);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    }
  };

  useEffect(() => {
    if (employee) {
      loadLeaveBalance();
      loadMyRequests();
    }
  }, [employee]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('annual');
    setIsHalfDay(false);
    setHalfDayPeriod('morning');
    setSelectedPreviewDate(null);
  };

  const handleSubmitRequest = async () => {
    if (!startDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!isHalfDay && !endDate) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (!employee) {
      Alert.alert('Error', 'Employee data not loaded');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createLeaveRequest(
        employee.id,
        leaveType,
        startDate,
        isHalfDay ? startDate : endDate, // For half-day, end date = start date
        reason,
        isHalfDay,
        isHalfDay ? halfDayPeriod : null
      );

      if (result.success) {
        Alert.alert('Success', 'Leave request submitted successfully');
        setShowRequestModal(false);
        resetForm();
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      Alert.alert('Error', 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#10b981'; // green
      case 'rejected':
        return '#ef4444'; // red
      case 'pending':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'pending':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getLeaveTypeLabel = (type) => {
    switch (type) {
      case 'annual':
        return 'Annual Leave';
      case 'sick':
        return 'Sick Leave';
      case 'casual':
        return 'Casual Leave';
      default:
        return type;
    }
  };

  const renderRequest = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {getLeaveTypeLabel(item.leaveType)}
          </Text>
          <Text className="text-gray-600 text-sm">
            {new Date(item.startDate).toLocaleDateString()}{item.startDate !== item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString()}` : ''}
            {item.isHalfDay && ` (${item.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'})`}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            {item.isHalfDay ? 'Half day' : `${item.days} day${item.days !== 1 ? 's' : ''}`} • Requested {new Date(item.requestedAt).toLocaleDateString()}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center mb-1">
            <Ionicons 
              name={getStatusIcon(item.status)} 
              size={20} 
              color={getStatusColor(item.status)} 
            />
            <Text 
              className="text-sm font-medium ml-1 capitalize"
              style={{ color: getStatusColor(item.status) }}
            >
              {item.status}
            </Text>
          </View>
          {item.processedAt && (
            <Text className="text-xs text-gray-500">
              {new Date(item.processedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      {item.reason && (
        <Text className="text-gray-600 text-sm mt-2">
          Reason: {item.reason}
        </Text>
      )}
      {item.adminNotes && (
        <Text className="text-sm mt-2" style={{ color: item.status === 'rejected' ? '#ef4444' : '#10b981' }}>
          Admin Note: {item.adminNotes}
        </Text>
      )}
    </View>
  );

  const remaining = leaveBalance ? calculateRemainingLeaves(leaveBalance) : null;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-800">
            Leave Requests
          </Text>
          <TouchableOpacity
            className="bg-primary-500 rounded-xl px-4 py-2"
            onPress={() => setShowRequestModal(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="add" size={18} color="white" />
              <Text className="text-white font-semibold ml-1">New Request</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Leave Balance Card */}
        {leaveBalance && remaining && (
          <View className="bg-white mx-4 my-4 rounded-xl p-4 shadow-sm">
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Leave Balance
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Annual Leaves</Text>
                <Text className="font-semibold text-gray-800">
                  {remaining.annual} / {leaveBalance.annualLeaves}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Sick Leaves</Text>
                <Text className="font-semibold text-gray-800">
                  {remaining.sick} / {leaveBalance.sickLeaves}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Casual Leaves</Text>
                <Text className="font-semibold text-gray-800">
                  {remaining.casual} / {leaveBalance.casualLeaves}
                </Text>
              </View>
              <View className="border-t border-gray-200 pt-2 mt-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-800 font-semibold">Total Remaining</Text>
                  <Text className="font-bold text-primary-500 text-lg">
                    {remaining.total} days
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* My Requests */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            My Leave Requests
          </Text>
          {myRequests.length > 0 ? (
            <FlatList
              data={myRequests}
              renderItem={renderRequest}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View className="bg-white rounded-xl p-8 items-center">
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4 text-center">
                No leave requests yet
              </Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Tap "New Request" to submit a leave request
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* New Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRequestModal(false);
          resetForm();
        }}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  New Leave Request
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowRequestModal(false);
                  resetForm();
                }}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Leave Type Selection */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Leave Type</Text>
                <View className="flex-row space-x-2">
                  {['annual', 'sick', 'casual'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      className={`flex-1 rounded-lg p-3 border-2 ${
                        leaveType === type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => setLeaveType(type)}
                    >
                      <Text
                        className={`text-center font-medium ${
                          leaveType === type ? 'text-primary-600' : 'text-gray-600'
                        }`}
                      >
                        {getLeaveTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Half Day Toggle */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Leave Duration</Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    className={`flex-1 rounded-lg p-3 border-2 ${
                      !isHalfDay
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setIsHalfDay(false)}
                  >
                    <Text
                      className={`text-center font-medium ${
                        !isHalfDay ? 'text-primary-600' : 'text-gray-600'
                      }`}
                    >
                      Full Day(s)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 rounded-lg p-3 border-2 ${
                      isHalfDay
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setIsHalfDay(true)}
                  >
                    <Text
                      className={`text-center font-medium ${
                        isHalfDay ? 'text-primary-600' : 'text-gray-600'
                      }`}
                    >
                      Half Day
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Half Day Period Selection */}
              {isHalfDay && (
                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Half Day Period</Text>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      className={`flex-1 rounded-lg p-3 border-2 ${
                        halfDayPeriod === 'morning'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => setHalfDayPeriod('morning')}
                    >
                      <View className="items-center">
                        <Ionicons 
                          name="sunny-outline" 
                          size={20} 
                          color={halfDayPeriod === 'morning' ? '#f59e0b' : '#6b7280'} 
                        />
                        <Text
                          className={`text-center font-medium mt-1 ${
                            halfDayPeriod === 'morning' ? 'text-amber-600' : 'text-gray-600'
                          }`}
                        >
                          Morning
                        </Text>
                        <Text className="text-xs text-gray-500">First half</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 rounded-lg p-3 border-2 ${
                        halfDayPeriod === 'afternoon'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => setHalfDayPeriod('afternoon')}
                    >
                      <View className="items-center">
                        <Ionicons 
                          name="partly-sunny-outline" 
                          size={20} 
                          color={halfDayPeriod === 'afternoon' ? '#ea580c' : '#6b7280'} 
                        />
                        <Text
                          className={`text-center font-medium mt-1 ${
                            halfDayPeriod === 'afternoon' ? 'text-orange-600' : 'text-gray-600'
                          }`}
                        >
                          Afternoon
                        </Text>
                        <Text className="text-xs text-gray-500">Second half</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Date Selection Calendar */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">
                  {isHalfDay ? 'Select Date' : 'Select Date Range'}
                </Text>
                {isHalfDay ? (
                  <DatePickerCalendar
                    onDateSelect={(date) => {
                      setSelectedPreviewDate(date);
                    }}
                    selectedStartDate={startDate}
                    selectedEndDate={null}
                    previewDate={selectedPreviewDate}
                    allowRangeSelection={false}
                  />
                ) : (
                  <DatePickerCalendar
                    onDateSelect={(date) => {
                      setSelectedPreviewDate(date);
                    }}
                    selectedStartDate={startDate}
                    selectedEndDate={endDate}
                    previewDate={selectedPreviewDate}
                    allowRangeSelection={true}
                  />
                )}

                {/* Action Buttons for Full Day Leaves */}
                {!isHalfDay && (
                  <View className="mt-4 flex-row space-x-2">
                    <TouchableOpacity
                      className={`flex-1 rounded-lg p-3 border-2 ${
                        startDate
                          ? 'border-red-500 bg-red-50'
                          : selectedPreviewDate
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 bg-gray-100'
                      }`}
                      onPress={() => {
                        if (startDate) {
                          // Unselect start date
                          setStartDate('');
                          if (endDate && endDate === startDate) {
                            setEndDate('');
                          }
                        } else if (selectedPreviewDate) {
                          // Set selected date as start date
                          setStartDate(selectedPreviewDate);
                          // If end date is before new start date, clear it
                          if (endDate && new Date(endDate) < new Date(selectedPreviewDate)) {
                            setEndDate('');
                          }
                          setSelectedPreviewDate(null); // Clear preview after assignment
                        }
                      }}
                      disabled={!selectedPreviewDate && !startDate}
                    >
                      <Text
                        className={`text-center font-medium ${
                          startDate
                            ? 'text-red-600'
                            : selectedPreviewDate
                            ? 'text-white'
                            : 'text-gray-500'
                        }`}
                      >
                        {startDate ? 'Unselect Start Date' : 'Select Start Date'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 rounded-lg p-3 border-2 ${
                        endDate
                          ? 'border-red-500 bg-red-50'
                          : selectedPreviewDate && startDate && new Date(selectedPreviewDate) >= new Date(startDate)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 bg-gray-100'
                      }`}
                      onPress={() => {
                        if (endDate) {
                          // Unselect end date
                          setEndDate('');
                        } else if (selectedPreviewDate && startDate) {
                          // Validate that end date is after start date
                          if (new Date(selectedPreviewDate) >= new Date(startDate)) {
                            setEndDate(selectedPreviewDate);
                            setSelectedPreviewDate(null); // Clear preview after assignment
                          } else {
                            Alert.alert('Invalid Date', 'End date must be on or after start date');
                          }
                        } else if (selectedPreviewDate && !startDate) {
                          Alert.alert('Select Start Date First', 'Please select a start date before selecting an end date');
                        }
                      }}
                      disabled={(!selectedPreviewDate || !startDate) && !endDate}
                    >
                      <Text
                        className={`text-center font-medium ${
                          endDate
                            ? 'text-red-600'
                            : selectedPreviewDate && startDate && new Date(selectedPreviewDate) >= new Date(startDate)
                            ? 'text-white'
                            : 'text-gray-500'
                        }`}
                      >
                        {endDate ? 'Unselect End Date' : 'Select End Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action Button for Half Day Leaves */}
                {isHalfDay && (
                  <View className="mt-4">
                    <TouchableOpacity
                      className={`rounded-lg p-3 border-2 ${
                        startDate
                          ? 'border-red-500 bg-red-50'
                          : selectedPreviewDate
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300 bg-gray-100'
                      }`}
                      onPress={() => {
                        if (startDate) {
                          // Unselect date
                          setStartDate('');
                          setEndDate('');
                        } else if (selectedPreviewDate) {
                          // Set selected date
                          setStartDate(selectedPreviewDate);
                          setEndDate(selectedPreviewDate);
                          setSelectedPreviewDate(null); // Clear preview after assignment
                        }
                      }}
                      disabled={!selectedPreviewDate && !startDate}
                    >
                      <Text
                        className={`text-center font-medium ${
                          startDate
                            ? 'text-red-600'
                            : selectedPreviewDate
                            ? 'text-white'
                            : 'text-gray-500'
                        }`}
                      >
                        {startDate ? 'Unselect Date' : 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Display Selected Dates */}
                {(startDate || endDate) && (
                  <View className="mt-3 flex-row items-center justify-center space-x-4">
                    {startDate && (
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
                        <Text className="text-sm text-gray-700 ml-1">
                          {isHalfDay ? 'Date' : 'Start'}: {new Date(startDate).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    {!isHalfDay && endDate && startDate !== endDate && (
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
                        <Text className="text-sm text-gray-700 ml-1">
                          End: {new Date(endDate).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Reason */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Reason (Optional)</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Enter reason for leave..."
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View className="flex-row space-x-2 mt-4">
                <TouchableOpacity
                  className="bg-gray-200 rounded-lg p-3 flex-1"
                  onPress={() => {
                    setShowRequestModal(false);
                    resetForm();
                  }}
                >
                  <Text className="text-center font-medium text-gray-700">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="bg-primary-500 rounded-lg p-3 flex-1"
                  onPress={handleSubmitRequest}
                  disabled={isSubmitting}
                >
                  <Text className="text-center font-medium text-white">
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
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

