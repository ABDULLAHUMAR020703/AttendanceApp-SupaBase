import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getEmployees, 
  updateEmployeeWorkMode, 
  getWorkModeStatistics,
  getPendingWorkModeRequests,
  processWorkModeRequest,
  getManageableEmployees,
  canManageEmployee,
  updateEmployee
} from '../utils/employees';
import { 
  getAllWorkModes, 
  getWorkModeLabel, 
  getWorkModeColor,
  getWorkModeIcon 
} from '../utils/workModes';
import {
  getDefaultLeaveSettings,
  updateDefaultLeaveSettings,
  getEmployeeLeaveBalance,
  updateEmployeeLeaveBalance,
  resetEmployeeLeaveToDefault,
  calculateRemainingLeaves,
  getPendingLeaveRequests,
  processLeaveRequest,
  getAllLeaveRequests
} from '../utils/leaveManagement';
import { 
  getHRRoleFromPosition, 
  getHRRoleColor, 
  getHRRoleIcon, 
  getHRRoleLabel 
} from '../utils/hrRoles';

export default function EmployeeManagement({ route }) {
  const { user, openLeaveRequests } = route.params || {};
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showWorkModeModal, setShowWorkModeModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [showLeaveRequestsModal, setShowLeaveRequestsModal] = useState(openLeaveRequests || false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [employeeLeaveBalances, setEmployeeLeaveBalances] = useState({}); // { employeeId: { remaining, balance } }
  const [stats, setStats] = useState({ total: 0, inOffice: 0, semiRemote: 0, fullyRemote: 0 });
  
  // Leave Management States
  const [showLeaveSettingsModal, setShowLeaveSettingsModal] = useState(false);
  const [showEmployeeLeaveModal, setShowEmployeeLeaveModal] = useState(false);
  const [defaultLeaveSettings, setDefaultLeaveSettings] = useState({
    defaultAnnualLeaves: 20,
    defaultSickLeaves: 10,
    defaultCasualLeaves: 5
  });
  const [employeeLeaveData, setEmployeeLeaveData] = useState(null);
  const [leaveInputs, setLeaveInputs] = useState({
    annualLeaves: '',
    sickLeaves: '',
    casualLeaves: ''
  });
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [selectedEmployeeForRoleEdit, setSelectedEmployeeForRoleEdit] = useState(null);
  const [selectedRole, setSelectedRole] = useState('employee');

  useEffect(() => {
    loadData();
  }, []);

  // Reload leave requests when employees change
  useEffect(() => {
    if (employees.length > 0) {
      loadPendingLeaveRequests();
    }
  }, [employees]);

  const loadData = async () => {
    await Promise.all([
      loadEmployees(),
      loadPendingRequests(),
      loadPendingLeaveRequests(),
      loadStatistics(),
      loadDefaultLeaveSettings()
    ]);
    // Load leave balances after employees are loaded
    if (employees.length > 0) {
      await loadEmployeeLeaveBalances();
    }
  };

  const loadEmployeeLeaveBalances = async () => {
    try {
      const balances = {};
      for (const employee of employees) {
        const balance = await getEmployeeLeaveBalance(employee.id);
        const remaining = calculateRemainingLeaves(balance);
        balances[employee.id] = { balance, remaining };
      }
      setEmployeeLeaveBalances(balances);
    } catch (error) {
      console.error('Error loading employee leave balances:', error);
    }
  };
  
  const loadDefaultLeaveSettings = async () => {
    try {
      const settings = await getDefaultLeaveSettings();
      setDefaultLeaveSettings(settings);
    } catch (error) {
      console.error('Error loading default leave settings:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      // Get employees based on user's role
      // Super admins see everyone, managers see only their department
      const employeeList = await getManageableEmployees(user);
      setEmployees(employeeList);
      setFilteredEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    }
  };

  const loadPendingRequests = async () => {
    try {
      const requests = await getPendingWorkModeRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const loadPendingLeaveRequests = async () => {
    try {
      const allRequests = await getPendingLeaveRequests();
      // Filter leave requests to only show those for employees the user can manage
      const manageableEmployeeIds = new Set(employees.map(emp => emp.id));
      const filteredRequests = allRequests.filter(req => 
        manageableEmployeeIds.has(req.employeeId)
      );
      setPendingLeaveRequests(filteredRequests);
    } catch (error) {
      console.error('Error loading pending leave requests:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const statistics = await getWorkModeStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleWorkModeChange = (employee) => {
    // Check if user can manage this employee
    if (!canManageEmployee(user, employee)) {
      Alert.alert('Permission Denied', 'You can only manage work modes for employees in your department.');
      return;
    }
    setSelectedEmployee(employee);
    setShowWorkModeModal(true);
  };

  const confirmWorkModeChange = async (newWorkMode) => {
    try {
      const success = await updateEmployeeWorkMode(
        selectedEmployee.id, 
        newWorkMode, 
        user.username
      );
      
      if (success) {
        Alert.alert(
          'Success', 
          `${selectedEmployee.name}'s work mode updated to ${getWorkModeLabel(newWorkMode)}`
        );
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to update work mode');
      }
    } catch (error) {
      console.error('Error updating work mode:', error);
      Alert.alert('Error', 'Failed to update work mode');
    } finally {
      setShowWorkModeModal(false);
      setSelectedEmployee(null);
    }
  };

  const handleProcessRequest = async (requestId, status) => {
    try {
      const success = await processWorkModeRequest(
        requestId, 
        status, 
        user.username,
        status === 'approved' ? 'Request approved' : 'Request rejected'
      );
      
      if (success) {
        Alert.alert(
          'Success', 
          `Request ${status} successfully`
        );
        await loadData();
      } else {
        Alert.alert('Error', 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing request:', error);
      Alert.alert('Error', 'Failed to process request');
    }
  };

  const handleProcessLeaveRequest = async (requestId, status) => {
    // Check if user can manage this leave request
    const request = pendingLeaveRequests.find(req => req.id === requestId);
    if (request) {
      const employee = employees.find(emp => emp.id === request.employeeId);
      if (employee && !canManageEmployee(user, employee)) {
        Alert.alert('Permission Denied', 'You can only manage leave requests for employees in your department.');
        return;
      }
    }
    try {
      const result = await processLeaveRequest(
        requestId,
        status,
        user.username,
        status === 'approved' ? 'Leave request approved' : 'Leave request rejected'
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Leave request ${status} successfully`
        );
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to process leave request');
      }
    } catch (error) {
      console.error('Error processing leave request:', error);
      Alert.alert('Error', 'Failed to process leave request');
    }
  };

  const handleManageLeaves = async (employee) => {
    // Check if user can manage this employee
    if (!canManageEmployee(user, employee)) {
      Alert.alert('Permission Denied', 'You can only manage leaves for employees in your department.');
      return;
    }
    
    try {
      // Use employee.id for AsyncStorage employees
      const employeeId = employee.id;
      const leaveBalance = await getEmployeeLeaveBalance(employeeId);
      setEmployeeLeaveData({ ...employee, leaveBalance });
      setLeaveInputs({
        annualLeaves: leaveBalance.annualLeaves?.toString() || '',
        sickLeaves: leaveBalance.sickLeaves?.toString() || '',
        casualLeaves: leaveBalance.casualLeaves?.toString() || ''
      });
      setShowEmployeeLeaveModal(true);
    } catch (error) {
      console.error('Error loading employee leave balance:', error);
      Alert.alert('Error', 'Failed to load leave balance');
    }
  };

  const handleSaveEmployeeLeaves = async () => {
    try {
      const employeeId = employeeLeaveData.id;
      
      if (!leaveInputs.annualLeaves || !leaveInputs.sickLeaves || !leaveInputs.casualLeaves) {
        Alert.alert('Error', 'Please fill in all leave fields');
        return;
      }

      const annualLeaves = parseInt(leaveInputs.annualLeaves);
      const sickLeaves = parseInt(leaveInputs.sickLeaves);
      const casualLeaves = parseInt(leaveInputs.casualLeaves);

      if (isNaN(annualLeaves) || isNaN(sickLeaves) || isNaN(casualLeaves)) {
        Alert.alert('Error', 'Please enter valid numbers');
        return;
      }

      if (annualLeaves < 0 || sickLeaves < 0 || casualLeaves < 0) {
        Alert.alert('Error', 'Leave values cannot be negative');
        return;
      }

      const result = await updateEmployeeLeaveBalance(employeeId, {
        annualLeaves,
        sickLeaves,
        casualLeaves
      });

      if (result.success) {
        Alert.alert('Success', 'Leave balance updated successfully');
        setShowEmployeeLeaveModal(false);
        setEmployeeLeaveData(null);
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to update leave balance');
      }
    } catch (error) {
      console.error('Error saving employee leaves:', error);
      Alert.alert('Error', 'Failed to save leave balance');
    }
  };

  const handleResetEmployeeLeaves = async () => {
    try {
      const employeeId = employeeLeaveData.id;
      
      Alert.alert(
        'Reset to Default',
        'Are you sure you want to reset this employee\'s leave balance to default values?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              const result = await resetEmployeeLeaveToDefault(employeeId);
              if (result.success) {
                Alert.alert('Success', 'Leave balance reset to default');
                setShowEmployeeLeaveModal(false);
                setEmployeeLeaveData(null);
                await loadData();
              } else {
                Alert.alert('Error', result.error || 'Failed to reset leave balance');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error resetting employee leaves:', error);
      Alert.alert('Error', 'Failed to reset leave balance');
    }
  };

  const handleSaveDefaultLeaves = async () => {
    try {
      Keyboard.dismiss();
      
      if (!defaultLeaveSettings.defaultAnnualLeaves || 
          !defaultLeaveSettings.defaultSickLeaves || 
          !defaultLeaveSettings.defaultCasualLeaves) {
        Alert.alert('Error', 'Please fill in all default leave fields');
        return;
      }

      const annualLeaves = parseInt(defaultLeaveSettings.defaultAnnualLeaves);
      const sickLeaves = parseInt(defaultLeaveSettings.defaultSickLeaves);
      const casualLeaves = parseInt(defaultLeaveSettings.defaultCasualLeaves);

      if (isNaN(annualLeaves) || isNaN(sickLeaves) || isNaN(casualLeaves)) {
        Alert.alert('Error', 'Please enter valid numbers');
        return;
      }

      if (annualLeaves < 0 || sickLeaves < 0 || casualLeaves < 0) {
        Alert.alert('Error', 'Leave values cannot be negative');
        return;
      }

      const result = await updateDefaultLeaveSettings({
        defaultAnnualLeaves: annualLeaves,
        defaultSickLeaves: sickLeaves,
        defaultCasualLeaves: casualLeaves
      });

      if (result.success) {
        Alert.alert('Success', 'Default leave settings updated successfully');
        setShowLeaveSettingsModal(false);
        await loadDefaultLeaveSettings();
      } else {
        Alert.alert('Error', result.error || 'Failed to update default leave settings');
      }
    } catch (error) {
      console.error('Error saving default leaves:', error);
      Alert.alert('Error', 'Failed to save default leave settings');
    }
  };

  const ROLES = [
    { value: 'employee', label: 'Employee' },
    { value: 'manager', label: 'Manager' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  const handleUpdateRole = async () => {
    if (!selectedEmployeeForRoleEdit) return;

    try {
      const result = await updateEmployee(selectedEmployeeForRoleEdit.id, {
        role: selectedRole,
      });

      if (result.success) {
        Alert.alert('Success', `Employee role updated to ${selectedRole}`);
        setShowRoleEditModal(false);
        setSelectedEmployeeForRoleEdit(null);
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Failed to update employee role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update employee role');
    }
  };

  const renderEmployee = ({ item }) => {
    // Get employee ID
    const employeeId = item.id;
    const leaveInfo = employeeLeaveBalances[employeeId];
    
    return (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {item.name}
          </Text>
          <Text className="text-gray-600 text-sm">
            {item.department} • {item.position}
          </Text>
            {/* HR Role Display */}
            {item.position && (
              <View className="flex-row items-center mt-1">
                <Ionicons 
                  name={getHRRoleIcon(getHRRoleFromPosition(item.position))} 
                  size={12} 
                  color={getHRRoleColor(getHRRoleFromPosition(item.position))} 
                />
                <Text 
                  className="text-xs font-medium ml-1"
                  style={{ color: getHRRoleColor(getHRRoleFromPosition(item.position)) }}
                >
                  {getHRRoleLabel(getHRRoleFromPosition(item.position))}
                </Text>
              </View>
            )}
            <Text className="text-gray-500 text-xs mt-1">
            @{item.username}
          </Text>
            
            {/* Remaining Leaves Display */}
            {leaveInfo && leaveInfo.remaining && (
              <View className="mt-2 pt-2 border-t border-gray-100">
                <Text className="text-xs text-gray-500 mb-1">Remaining Leaves:</Text>
                <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                  <Text className="text-xs text-gray-700">
                    <Text className="font-semibold text-blue-600">Annual:</Text> {leaveInfo.remaining.annual}
                  </Text>
                  <Text className="text-xs text-gray-700">
                    <Text className="font-semibold text-green-600">Sick:</Text> {leaveInfo.remaining.sick}
                  </Text>
                  <Text className="text-xs text-gray-700">
                    <Text className="font-semibold text-orange-600">Casual:</Text> {leaveInfo.remaining.casual}
                  </Text>
                  <Text className="text-xs font-semibold text-primary-500">
                    Total: {leaveInfo.remaining.total} days
                  </Text>
                </View>
              </View>
            )}
        </View>
        
        <View className="items-end">
          <View className="flex-row items-center mb-2">
            <Ionicons 
              name={getWorkModeIcon(item.workMode)} 
              size={16} 
              color={getWorkModeColor(item.workMode)} 
            />
            <Text 
              className="text-sm font-medium ml-1"
              style={{ color: getWorkModeColor(item.workMode) }}
            >
              {getWorkModeLabel(item.workMode)}
            </Text>
          </View>
          
            <View className="flex-row space-x-2">
          <TouchableOpacity
            className="bg-primary-500 rounded-lg px-3 py-1"
            onPress={() => handleWorkModeChange(item)}
          >
                <Text className="text-white text-xs font-medium">Work Mode</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-green-500 rounded-lg px-3 py-1"
                onPress={() => handleManageLeaves(item)}
              >
                <Text className="text-white text-xs font-medium">Leaves</Text>
          </TouchableOpacity>
              
              {/* Role Edit Button - Only for super_admin */}
              {user.role === 'super_admin' && (
                <TouchableOpacity
                  className="bg-purple-500 rounded-lg px-3 py-1"
                  onPress={() => {
                    setSelectedEmployeeForRoleEdit(item);
                    setSelectedRole(item.role);
                    setShowRoleEditModal(true);
                  }}
                >
                  <Text className="text-white text-xs font-medium">Role</Text>
                </TouchableOpacity>
              )}
            </View>
        </View>
      </View>
    </View>
  );
  };

  const renderPendingRequest = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-semibold text-gray-800">
          {item.employeeId}
        </Text>
        <Text className="text-xs text-gray-500">
          {new Date(item.requestedAt).toLocaleDateString()}
        </Text>
      </View>
      
      <Text className="text-gray-600 mb-2">
        Requesting: <Text className="font-medium">{getWorkModeLabel(item.requestedMode)}</Text>
      </Text>
      
      {item.reason && (
        <Text className="text-gray-500 text-sm mb-3">
          Reason: {item.reason}
        </Text>
      )}
      
      <View className="flex-row space-x-2">
        <TouchableOpacity
          className="bg-green-500 rounded-lg px-4 py-2 flex-1"
          onPress={() => handleProcessRequest(item.id, 'approved')}
        >
          <Text className="text-white text-center font-medium">Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-red-500 rounded-lg px-4 py-2 flex-1"
          onPress={() => handleProcessRequest(item.id, 'rejected')}
        >
          <Text className="text-white text-center font-medium">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingLeaveRequest = ({ item }) => {
    // Get employee name
    const employee = employees.find(emp => emp.id === item.employeeId);
    const employeeName = employee ? employee.name : item.employeeId;

    const getLeaveTypeLabel = (type) => {
      switch (type) {
        case 'annual': return 'Annual Leave';
        case 'sick': return 'Sick Leave';
        case 'casual': return 'Casual Leave';
        default: return type;
      }
    };

    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-lg font-semibold text-gray-800">
            {employeeName}
          </Text>
          <Text className="text-xs text-gray-500">
            {new Date(item.requestedAt).toLocaleDateString()}
          </Text>
        </View>
        
        <Text className="text-gray-600 mb-2">
          <Text className="font-medium">{getLeaveTypeLabel(item.leaveType)}</Text>
          {' • '}
          <Text className="font-medium">
            {item.isHalfDay ? 'Half day' : `${item.days} day${item.days !== 1 ? 's' : ''}`}
          </Text>
          {item.isHalfDay && (
            <Text className="text-amber-600"> ({item.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'})</Text>
          )}
        </Text>
        
        <Text className="text-gray-500 text-sm mb-1">
          {new Date(item.startDate).toLocaleDateString()}
          {item.startDate !== item.endDate && ` - ${new Date(item.endDate).toLocaleDateString()}`}
        </Text>
        
        {item.reason && (
          <Text className="text-gray-500 text-sm mb-3">
            Reason: {item.reason}
          </Text>
        )}
        
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className="bg-green-500 rounded-lg px-4 py-2 flex-1"
            onPress={() => handleProcessLeaveRequest(item.id, 'approved')}
          >
            <Text className="text-white text-center font-medium">Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-red-500 rounded-lg px-4 py-2 flex-1"
            onPress={() => handleProcessLeaveRequest(item.id, 'rejected')}
          >
            <Text className="text-white text-center font-medium">Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const WorkModeModal = () => (
    <Modal
      visible={showWorkModeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowWorkModeModal(false)}
    >
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            Change Work Mode
          </Text>
          
          <Text className="text-gray-600 mb-4">
            {selectedEmployee?.name} - Current: {getWorkModeLabel(selectedEmployee?.workMode)}
          </Text>
          
          {getAllWorkModes().map((mode) => (
            <TouchableOpacity
              key={mode.value}
              className={`flex-row items-center p-3 rounded-lg mb-2 ${
                selectedEmployee?.workMode === mode.value ? 'bg-gray-100' : ''
              }`}
              onPress={() => confirmWorkModeChange(mode.value)}
              disabled={selectedEmployee?.workMode === mode.value}
            >
              <Ionicons 
                name={mode.icon} 
                size={20} 
                color={mode.color} 
              />
              <View className="ml-3 flex-1">
                <Text className="font-medium text-gray-800">
                  {mode.label}
                </Text>
                <Text className="text-sm text-gray-500">
                  {mode.description}
                </Text>
              </View>
              {selectedEmployee?.workMode === mode.value && (
                <Ionicons name="checkmark" size={20} color="#10b981" />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            className="bg-gray-200 rounded-lg p-3 mt-4"
            onPress={() => setShowWorkModeModal(false)}
          >
            <Text className="text-center font-medium text-gray-700">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const PendingRequestsModal = () => (
    <Modal
      visible={showRequestsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRequestsModal(false)}
    >
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-md max-h-96">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-800">
              Pending Work Mode Requests
            </Text>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {pendingRequests.length > 0 ? (
            <FlatList
              data={pendingRequests}
              renderItem={renderPendingRequest}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="items-center py-8">
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text className="text-gray-600 mt-2">No pending work mode requests</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const PendingLeaveRequestsModal = () => (
    <Modal
      visible={showLeaveRequestsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLeaveRequestsModal(false)}
    >
      <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
        <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-md max-h-96">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-800">
              Pending Leave Requests
            </Text>
            <TouchableOpacity onPress={() => setShowLeaveRequestsModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {pendingLeaveRequests.length > 0 ? (
            <FlatList
              data={pendingLeaveRequests}
              renderItem={renderPendingLeaveRequest}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="items-center py-8">
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text className="text-gray-600 mt-2">No pending leave requests</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-800">
            Employee Management
          </Text>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity
              className="bg-blue-500 rounded-xl px-4 py-2"
              onPress={() => setShowLeaveSettingsModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="settings-outline" size={16} color="white" />
                <Text className="text-white font-semibold ml-1">Leaves</Text>
              </View>
            </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-orange-500 rounded-xl px-4 py-2"
            onPress={() => setShowRequestsModal(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications" size={16} color="white" />
              <Text className="text-white font-semibold ml-1">
                Requests ({pendingRequests.length})
              </Text>
            </View>
          </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View className="bg-white mx-4 my-4 rounded-xl p-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Work Mode Distribution
        </Text>
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-500">{stats.inOffice}</Text>
            <Text className="text-gray-600 text-sm">In Office</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-amber-500">{stats.semiRemote}</Text>
            <Text className="text-gray-600 text-sm">Semi Remote</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-emerald-500">{stats.fullyRemote}</Text>
            <Text className="text-gray-600 text-sm">Fully Remote</Text>
          </View>
        </View>
      </View>

      {/* Employees List */}
      {filteredEmployees.length > 0 ? (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
            No employees found
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Employees will appear here once they are added to the system
          </Text>
        </View>
      )}

      <WorkModeModal />
      <PendingRequestsModal />
      <PendingLeaveRequestsModal />
      <LeaveSettingsModal
        visible={showLeaveSettingsModal}
        onClose={() => setShowLeaveSettingsModal(false)}
        defaultSettings={defaultLeaveSettings}
        onSave={handleSaveDefaultLeaves}
        onSettingsChange={setDefaultLeaveSettings}
      />
      {/* Role Edit Modal */}
      <Modal
        visible={showRoleEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleEditModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Edit Employee Role
            </Text>
            
            {selectedEmployeeForRoleEdit && (
              <View className="mb-4">
                <Text className="text-gray-600 mb-2">
                  Employee: <Text className="font-medium">{selectedEmployeeForRoleEdit.name}</Text>
                </Text>
                <Text className="text-gray-500 text-sm">
                  @{selectedEmployeeForRoleEdit.username}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Current Role: <Text className="font-medium capitalize">{selectedEmployeeForRoleEdit.role}</Text>
                </Text>
              </View>
            )}
            
            <Text className="text-gray-800 font-medium mb-2">
              Select New Role:
            </Text>
            <View className="mb-4">
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  className={`rounded-lg p-3 mb-2 ${selectedRole === role.value ? 'bg-primary-500' : 'bg-gray-200'}`}
                  onPress={() => setSelectedRole(role.value)}
                >
                  <Text className={`font-medium ${selectedRole === role.value ? 'text-white' : 'text-gray-700'}`}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg p-3 flex-1"
                onPress={() => {
                  setShowRoleEditModal(false);
                  setSelectedEmployeeForRoleEdit(null);
                }}
              >
                <Text className="text-center font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-primary-500 rounded-lg p-3 flex-1"
                onPress={handleUpdateRole}
              >
                <Text className="text-center font-medium text-white">Update Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EmployeeLeaveModal
        visible={showEmployeeLeaveModal}
        onClose={() => {
          setShowEmployeeLeaveModal(false);
          setEmployeeLeaveData(null);
        }}
        employeeData={employeeLeaveData}
        leaveInputs={leaveInputs}
        onInputChange={setLeaveInputs}
        onSave={handleSaveEmployeeLeaves}
        onReset={handleResetEmployeeLeaves}
      />
    </View>
  );
}

// Leave Settings Modal Component
const LeaveSettingsModal = ({ visible, onClose, defaultSettings, onSave, onSettingsChange }) => {
  if (!visible) return null;
  
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSaveAndClose = async () => {
    Keyboard.dismiss();
    await onSave();
  };

  const handleBack = async () => {
    Keyboard.dismiss();
    await onSave();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBack}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm">
              {/* Header with Back Button */}
              <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                  onPress={handleBack}
                  className="flex-row items-center"
                >
                  <Ionicons name="arrow-back" size={24} color="#3b82f6" />
                  <Text className="text-primary-500 font-semibold ml-2">Back</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800 flex-1 text-center">
                  Default Leave Settings
                </Text>
                <View style={{ width: 80 }} />
              </View>
              
              <Text className="text-gray-600 mb-4 text-sm">
                Set default leave balances for all employees. These values will be applied to new employees.
              </Text>
              
              {/* Annual Leaves */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Annual Leaves (days/year)</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="20"
                  value={defaultSettings?.defaultAnnualLeaves?.toString() || ''}
                  onChangeText={(text) => onSettingsChange({ ...defaultSettings, defaultAnnualLeaves: text })}
                  keyboardType="numeric"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              
              {/* Sick Leaves */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Sick Leaves (days/year)</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="10"
                  value={defaultSettings?.defaultSickLeaves?.toString() || ''}
                  onChangeText={(text) => onSettingsChange({ ...defaultSettings, defaultSickLeaves: text })}
                  keyboardType="numeric"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              
              {/* Casual Leaves */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Casual Leaves (days/year)</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="5"
                  value={defaultSettings?.defaultCasualLeaves?.toString() || ''}
                  onChangeText={(text) => onSettingsChange({ ...defaultSettings, defaultCasualLeaves: text })}
                  keyboardType="numeric"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              
              <View className="flex-row space-x-2 mt-4">
                <TouchableOpacity
                  className="bg-gray-200 rounded-lg p-3 flex-1"
                  onPress={handleClose}
                >
                  <Text className="text-center font-medium text-gray-700">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="bg-primary-500 rounded-lg p-3 flex-1"
                  onPress={handleSaveAndClose}
                >
                  <Text className="text-center font-medium text-white">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Employee Leave Modal Component
const EmployeeLeaveModal = ({ visible, onClose, employeeData, leaveInputs, onInputChange, onSave, onReset }) => {
  if (!visible || !employeeData) return null;
  
  const remaining = employeeData.leaveBalance ? calculateRemainingLeaves(employeeData.leaveBalance) : null;

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSaveAndClose = async () => {
    Keyboard.dismiss();
    await onSave();
  };

  const handleBack = async () => {
    Keyboard.dismiss();
    await onSave();
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBack}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <TouchableWithoutFeedback onPress={() => {}}>
            <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-sm max-h-96">
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header with Back Button */}
                <View className="flex-row items-center justify-between mb-2">
                  <TouchableOpacity
                    onPress={handleBack}
                    className="flex-row items-center"
                  >
                    <Ionicons name="arrow-back" size={24} color="#3b82f6" />
                    <Text className="text-primary-500 font-semibold ml-2">Back</Text>
                  </TouchableOpacity>
                  <Text className="text-xl font-bold text-gray-800 flex-1 text-center">
                    Manage Leaves
                  </Text>
                  <View style={{ width: 80 }} />
                </View>
                
                <Text className="text-gray-600 mb-4 text-sm">
                  {employeeData.name} - {employeeData.position}
                </Text>
            
            {/* Current Leave Balance Display */}
            {employeeData.leaveBalance && (
              <View className="bg-gray-50 rounded-lg p-3 mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Current Balance:</Text>
                <View className="space-y-1">
                  <Text className="text-xs text-gray-600">
                    Annual: {employeeData.leaveBalance.usedAnnualLeaves || 0} / {employeeData.leaveBalance.annualLeaves || 0} used
                    {remaining && ` (${remaining.annual} remaining)`}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Sick: {employeeData.leaveBalance.usedSickLeaves || 0} / {employeeData.leaveBalance.sickLeaves || 0} used
                    {remaining && ` (${remaining.sick} remaining)`}
                  </Text>
                  <Text className="text-xs text-gray-600">
                    Casual: {employeeData.leaveBalance.usedCasualLeaves || 0} / {employeeData.leaveBalance.casualLeaves || 0} used
                    {remaining && ` (${remaining.casual} remaining)`}
                  </Text>
                </View>
                {employeeData.leaveBalance.isCustom && (
                  <Text className="text-xs text-blue-600 mt-2">Custom leave balance</Text>
                )}
              </View>
            )}
            
            {/* Annual Leaves Input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Annual Leaves</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                placeholder="20"
                value={leaveInputs.annualLeaves}
                onChangeText={(text) => onInputChange({ ...leaveInputs, annualLeaves: text })}
                keyboardType="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
            
            {/* Sick Leaves Input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Sick Leaves</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                placeholder="10"
                value={leaveInputs.sickLeaves}
                onChangeText={(text) => onInputChange({ ...leaveInputs, sickLeaves: text })}
                keyboardType="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
            
            {/* Casual Leaves Input */}
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Casual Leaves</Text>
              <TextInput
                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                placeholder="5"
                value={leaveInputs.casualLeaves}
                onChangeText={(text) => onInputChange({ ...leaveInputs, casualLeaves: text })}
                keyboardType="numeric"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
            
            <View className="flex-row space-x-2 mt-4">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg p-3 flex-1"
                onPress={handleClose}
              >
                <Text className="text-center font-medium text-gray-700">Cancel</Text>
              </TouchableOpacity>
              
              {employeeData.leaveBalance?.isCustom && (
                <TouchableOpacity
                  className="bg-orange-500 rounded-lg p-3 flex-1"
                  onPress={() => {
                    Keyboard.dismiss();
                    onReset();
                  }}
                >
                  <Text className="text-center font-medium text-white">Reset</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                className="bg-primary-500 rounded-lg p-3 flex-1"
                onPress={handleSaveAndClose}
              >
                <Text className="text-center font-medium text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
