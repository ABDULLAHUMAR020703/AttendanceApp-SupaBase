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
import { useTheme } from '../contexts/ThemeContext';

export default function LeaveRequestScreen({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
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

  const handleSubmitRequest = async () => {
    if (!startDate || !endDate) {
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
        endDate,
        reason
      );

      if (result.success) {
        Alert.alert('Success', 'Leave request submitted successfully');
        setShowRequestModal(false);
        setStartDate('');
        setEndDate('');
        setReason('');
        setLeaveType('annual');
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
            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">
            {item.days} day{item.days !== 1 ? 's' : ''} • Requested {new Date(item.requestedAt).toLocaleDateString()}
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              Leave Requests
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setShowRequestModal(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>New Request</Text>
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
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', marginTop: 100 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
                  New Leave Request
                </Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Leave Type Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Leave Type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['annual', 'sick', 'casual'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 2,
                        borderColor: leaveType === type ? colors.primary : colors.border,
                        backgroundColor: leaveType === type ? colors.primaryLight : colors.surface,
                      }}
                      onPress={() => setLeaveType(type)}
                    >
                      <Text
                        style={{
                          textAlign: 'center',
                          fontWeight: '500',
                          color: leaveType === type ? colors.primary : colors.text
                        }}
                      >
                        {getLeaveTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Start Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Start Date</Text>
                <TextInput
                  style={{ backgroundColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.text }}
                  placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
                  placeholderTextColor={colors.textTertiary}
                  value={startDate}
                  onChangeText={setStartDate}
                />
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                  Format: YYYY-MM-DD
                </Text>
              </View>

              {/* End Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>End Date</Text>
                <TextInput
                  style={{ backgroundColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.text }}
                  placeholder="YYYY-MM-DD (e.g., 2024-01-20)"
                  placeholderTextColor={colors.textTertiary}
                  value={endDate}
                  onChangeText={setEndDate}
                />
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                  Format: YYYY-MM-DD
                </Text>
              </View>

              {/* Reason */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Reason (Optional)</Text>
                <TextInput
                  style={{ backgroundColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.text, minHeight: 80 }}
                  placeholder="Enter reason for leave..."
                  placeholderTextColor={colors.textTertiary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  style={{ backgroundColor: colors.borderLight, borderRadius: 8, padding: 12, flex: 1 }}
                  onPress={() => setShowRequestModal(false)}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '500', color: colors.text }}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 12, flex: 1 }}
                  onPress={handleSubmitRequest}
                  disabled={isSubmitting}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '500', color: 'white' }}>
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

