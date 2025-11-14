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
  processWorkModeRequest
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
import { useTheme } from '../contexts/ThemeContext';

export default function EmployeeManagement({ route, navigation }) {
  const { user } = route.params;
  const { colors } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showWorkModeModal, setShowWorkModeModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [showLeaveRequestsModal, setShowLeaveRequestsModal] = useState(false);
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

  useEffect(() => {
    loadData();
  }, []);

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
      const employeeList = await getEmployees();
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
      const requests = await getPendingLeaveRequests();
      setPendingLeaveRequests(requests);
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

  const renderEmployee = ({ item }) => {
    // Get employee ID
    const employeeId = item.id;
    const leaveInfo = employeeLeaveBalances[employeeId];
    
    return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
            {item.name}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {item.department} • {item.position}
          </Text>
            {/* HR Role Display */}
            {item.position && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Ionicons 
                  name={getHRRoleIcon(getHRRoleFromPosition(item.position))} 
                  size={12} 
                  color={getHRRoleColor(getHRRoleFromPosition(item.position))} 
                />
                <Text 
                  style={{ fontSize: 12, fontWeight: '500', marginLeft: 4, color: getHRRoleColor(getHRRoleFromPosition(item.position)) }}
                >
                  {getHRRoleLabel(getHRRoleFromPosition(item.position))}
                </Text>
              </View>
            )}
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
            @{item.username}
          </Text>
            
            {/* Remaining Leaves Display */}
            {leaveInfo && leaveInfo.remaining && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Remaining Leaves:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    <Text style={{ fontWeight: '600', color: colors.primary }}>Annual:</Text> {leaveInfo.remaining.annual}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    <Text style={{ fontWeight: '600', color: colors.success }}>Sick:</Text> {leaveInfo.remaining.sick}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    <Text style={{ fontWeight: '600', color: colors.warning }}>Casual:</Text> {leaveInfo.remaining.casual}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                    Total: {leaveInfo.remaining.total} days
                  </Text>
                </View>
              </View>
            )}
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons 
              name={getWorkModeIcon(item.workMode)} 
              size={16} 
              color={getWorkModeColor(item.workMode)} 
            />
            <Text 
              style={{ fontSize: 14, fontWeight: '500', marginLeft: 4, color: getWorkModeColor(item.workMode) }}
            >
              {getWorkModeLabel(item.workMode)}
            </Text>
          </View>
          
            <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => handleWorkModeChange(item)}
          >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>Work Mode</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{ backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                onPress={() => handleManageLeaves(item)}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>Leaves</Text>
          </TouchableOpacity>
            </View>
        </View>
      </View>
    </View>
  );
  };

  const renderPendingRequest = ({ item }) => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
          {item.employeeId}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {new Date(item.requestedAt).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
        Requesting: <Text style={{ fontWeight: '500', color: colors.text }}>{getWorkModeLabel(item.requestedMode)}</Text>
      </Text>
      
      {item.reason && (
        <Text style={{ color: colors.textTertiary, fontSize: 14, marginBottom: 12 }}>
          Reason: {item.reason}
        </Text>
      )}
      
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{ backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1 }}
          onPress={() => handleProcessRequest(item.id, 'approved')}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{ backgroundColor: colors.error, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1 }}
          onPress={() => handleProcessRequest(item.id, 'rejected')}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>Reject</Text>
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
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
            {employeeName}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {new Date(item.requestedAt).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
          <Text style={{ fontWeight: '500', color: colors.text }}>{getLeaveTypeLabel(item.leaveType)}</Text>
          {' • '}
          <Text style={{ fontWeight: '500', color: colors.text }}>{item.days} day{item.days !== 1 ? 's' : ''}</Text>
        </Text>
        
        <Text style={{ color: colors.textTertiary, fontSize: 14, marginBottom: 4 }}>
          {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
        </Text>
        
        {item.reason && (
          <Text style={{ color: colors.textTertiary, fontSize: 14, marginBottom: 12 }}>
            Reason: {item.reason}
          </Text>
        )}
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1 }}
            onPress={() => handleProcessLeaveRequest(item.id, 'approved')}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ backgroundColor: colors.error, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, flex: 1 }}
            onPress={() => handleProcessLeaveRequest(item.id, 'rejected')}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '500' }}>Reject</Text>
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View style={{ 
          flex: 1, 
          backgroundColor: colors.surface, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20,
          marginTop: 100,
          padding: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              Pending Work Mode Requests
            </Text>
            <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
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
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No pending work mode requests</Text>
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View style={{ 
          flex: 1, 
          backgroundColor: colors.surface, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20,
          marginTop: 100,
          padding: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              Pending Leave Requests
            </Text>
            <TouchableOpacity onPress={() => setShowLeaveRequestsModal(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
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
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No pending leave requests</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
            Employee Management
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setShowLeaveSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>Leaves</Text>
          </TouchableOpacity>
        
          <TouchableOpacity
            style={{
              backgroundColor: colors.warning,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setShowRequestsModal(true)}
          >
            <Ionicons name="notifications" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>
              Requests ({pendingRequests.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              backgroundColor: colors.success,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setShowLeaveRequestsModal(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>
              Leave Requests ({pendingLeaveRequests.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <Ionicons name="people-outline" size={64} color={colors.textTertiary} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
            No employees found
          </Text>
          <Text style={{ color: colors.textTertiary, textAlign: 'center', marginTop: 8 }}>
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
              <View className="flex-row items-center justify-center mb-4">
                <Text className="text-xl font-bold text-gray-800 text-center">
                  Default Leave Settings
                </Text>
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
                <View className="flex-row items-center justify-center mb-2">
                  <Text className="text-xl font-bold text-gray-800 text-center">
                    Manage Leaves
                  </Text>
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
