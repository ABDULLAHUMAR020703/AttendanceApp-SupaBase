import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getAttendanceRecords } from '../utils/storage';
import { getAllLeaveRequests, getPendingLeaveRequests } from '../utils/leaveManagement';
import {
  getAllTickets,
  getTicketsByStatus,
  TICKET_STATUS,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getCategoryLabel,
} from '../utils/ticketManagement';
import { getEmployees } from '../utils/employees';
import { generateAttendanceReport, generateLeaveReport } from '../utils/export';

export default function HRDashboard({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('overview'); // overview, attendance, leaves, tickets
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Overview stats
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAttendance: 0,
    pendingLeaves: 0,
    openTickets: 0,
  });
  
  // Attendance data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Leave data
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  
  // Ticket data
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState('all');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, activeTab, ticketFilter]);

  const loadData = async () => {
    await Promise.all([
      loadOverviewStats(),
      activeTab === 'attendance' && loadAttendanceData(),
      activeTab === 'leaves' && loadLeaveData(),
      activeTab === 'tickets' && loadTicketData(),
    ]);
  };

  const loadOverviewStats = async () => {
    try {
      const employees = await getEmployees();
      const attendance = await getAttendanceRecords();
      const pending = await getPendingLeaveRequests();
      const allTickets = await getAllTickets();
      const openTickets = allTickets.filter(t => t.status === TICKET_STATUS.OPEN || t.status === TICKET_STATUS.IN_PROGRESS);

      setStats({
        totalEmployees: employees.length,
        totalAttendance: attendance.length,
        pendingLeaves: pending.length,
        openTickets: openTickets.length,
      });
    } catch (error) {
      console.error('Error loading overview stats:', error);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const records = await getAttendanceRecords();
      const sorted = records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAttendanceRecords(sorted.slice(0, 50)); // Show last 50
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const loadLeaveData = async () => {
    try {
      const allLeaves = await getAllLeaveRequests();
      const pending = await getPendingLeaveRequests();
      const empList = await getEmployees();
      
      // Enrich leave requests with employee names
      const enrichedLeaves = allLeaves.map(leave => {
        const employee = empList.find(emp => emp.id === leave.employeeId);
        return {
          ...leave,
          employeeName: employee ? employee.name : leave.employeeId
        };
      });
      
      const sorted = enrichedLeaves.sort((a, b) => new Date(b.requestedAt || b.createdAt) - new Date(a.requestedAt || a.createdAt));
      setLeaveRequests(sorted);
      setPendingLeaves(pending);
    } catch (error) {
      console.error('Error loading leave data:', error);
    }
  };

  const loadTicketData = async () => {
    try {
      let allTicketsData = await getAllTickets();
      
      if (ticketFilter !== 'all') {
        allTicketsData = allTicketsData.filter(t => t.status === ticketFilter);
      }
      
      const sorted = allTicketsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTickets(sorted);
    } catch (error) {
      console.error('Error loading ticket data:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleGenerateAttendanceReport = async () => {
    try {
      Alert.alert('Generating Report', 'Please wait while we generate the attendance report...');
      const result = await generateAttendanceReport();
      
      if (result.success) {
        Alert.alert(
          'Report Generated',
          `Attendance report has been saved:\n${result.fileName}\n\nLocation: ${result.fileUri}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate attendance report');
      }
    } catch (error) {
      console.error('Error generating attendance report:', error);
      Alert.alert('Error', 'Failed to generate attendance report');
    }
  };

  const handleGenerateLeaveReport = async () => {
    try {
      Alert.alert('Generating Report', 'Please wait while we generate the leave report...');
      const result = await generateLeaveReport();
      
      if (result.success) {
        Alert.alert(
          'Report Generated',
          `Leave report has been saved:\n${result.fileName}\n\nLocation: ${result.fileUri}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate leave report');
      }
    } catch (error) {
      console.error('Error generating leave report:', error);
      Alert.alert('Error', 'Failed to generate leave report');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOverview = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ padding: 16 }}>
        {/* Stats Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              width: '47%',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                  {stats.totalEmployees}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Employees</Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              width: '47%',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#10b98120',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="time" size={20} color="#10b981" />
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                  {stats.totalAttendance}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Attendance</Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              width: '47%',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#f59e0b20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="calendar" size={20} color="#f59e0b" />
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                  {stats.pendingLeaves}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Pending Leaves</Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              width: '47%',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#ef444420',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="ticket" size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                  {stats.openTickets}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Open Tickets</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
            Quick Actions
          </Text>
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => navigation.navigate('EmployeeManagement', { user })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  Manage Employees
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  View and manage employee profiles
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={handleGenerateAttendanceReport}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#10b98120',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="document-text-outline" size={24} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  Generate Attendance Report
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Export attendance data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={handleGenerateLeaveReport}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#f59e0b20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="document-text-outline" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                  Generate Leave Report
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Export leave data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAttendance = () => (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
          Recent Attendance Records
        </Text>
      </View>
      {attendanceRecords.length > 0 ? (
        <FlatList
          data={attendanceRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {item.username}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {formatDate(item.timestamp)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: item.type === 'checkin' ? '#10b98120' : '#ef444420',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: item.type === 'checkin' ? '#10b981' : '#ef4444',
                      textTransform: 'capitalize',
                    }}
                  >
                    {item.type}
                  </Text>
                </View>
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="time-outline" size={64} color={colors.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
            No attendance records
          </Text>
        </View>
      )}
    </View>
  );

  const renderLeaves = () => (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
          Leave Requests
        </Text>
        {pendingLeaves.length > 0 && (
          <View
            style={{
              backgroundColor: '#f59e0b20',
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#f59e0b' }}>
              {pendingLeaves.length} Pending Leave Request{pendingLeaves.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
      {leaveRequests.length > 0 ? (
        <FlatList
          data={leaveRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginHorizontal: 16,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {item.employeeName || item.employeeId}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {item.startDate}{item.startDate !== item.endDate ? ` to ${item.endDate}` : ''} ({item.isHalfDay ? 'Half day' : `${item.days} day${item.days !== 1 ? 's' : ''}`})
                    {item.isHalfDay && ` - ${item.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon'}`}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: getStatusColor(item.status) + '20',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: getStatusColor(item.status),
                      textTransform: 'capitalize',
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' }}>
                {item.leaveType} Leave
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
            No leave requests
          </Text>
        </View>
      )}
    </View>
  );

  const renderTickets = () => (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
          Tickets
        </Text>
        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {['all', TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setTicketFilter(filterType)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: ticketFilter === filterType ? colors.primary : colors.background,
              }}
            >
              <Text
                style={{
                  color: ticketFilter === filterType ? 'white' : colors.textSecondary,
                  fontWeight: ticketFilter === filterType ? '600' : '400',
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {filterType === 'all' ? 'All' : getStatusLabel(filterType)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {tickets.length > 0 ? (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                marginHorizontal: 16,
                marginBottom: 12,
              }}
              onPress={() => navigation.navigate('TicketManagement', { user, ticket: item })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    {item.subject}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    By {item.createdBy} • {formatDate(item.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={{
                      backgroundColor: getStatusColor(item.status) + '20',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: getStatusColor(item.status),
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: getPriorityColor(item.priority) + '20',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: getPriorityColor(item.priority),
                      }}
                    >
                      {getPriorityLabel(item.priority)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 6 }}>
                  {getCategoryLabel(item.category)}
                </Text>
                {item.assignedTo && (
                  <>
                    <Text style={{ color: colors.textTertiary, marginHorizontal: 8 }}>•</Text>
                    <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 6 }}>
                      {item.assignedTo}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="ticket-outline" size={64} color={colors.textTertiary} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>
            No tickets
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 12,
          }}
        >
          HR Dashboard
        </Text>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['overview', 'attendance', 'leaves', 'tickets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeTab === tab ? colors.primary : colors.background,
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? 'white' : colors.textSecondary,
                  fontWeight: activeTab === tab ? '600' : '400',
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'leaves' && renderLeaves()}
      {activeTab === 'tickets' && renderTickets()}
    </View>
  );
}

