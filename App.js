import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
import EmployeeDashboard from './screens/EmployeeDashboard';
import AdminDashboard from './screens/AdminDashboard';
import AttendanceHistory from './screens/AttendanceHistory';
import CameraScreen from './screens/CameraScreen';
import AuthMethodSelection from './screens/AuthMethodSelection';
import LeaveRequestScreen from './screens/LeaveRequestScreen';
import CalendarScreen from './screens/CalendarScreen';
import ThemeSettingsScreen from './screens/ThemeSettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import TicketScreen from './screens/TicketScreen';
import HRDashboard from './screens/HRDashboard';
import TicketManagementScreen from './screens/TicketManagementScreen';
import ManualAttendanceScreen from './screens/ManualAttendanceScreen';

// Import auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';
// Import theme context
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Import employee initialization
import { initializeDefaultEmployees } from './utils/employees';

const Stack = createStackNavigator();


export default function App() {
  useEffect(() => {
    // Initialize default employees when app starts
    initializeDefaultEmployees();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { user, isLoading, handleLogin, handleLogout } = useAuth();
  const { colors, theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          // Auth Stack
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              title: 'Attendance App',
              headerShown: false 
            }}
          />
        ) : (
          // Main App Stack
          <>
            {(user.role === 'employee') ? (
              <>
                <Stack.Screen 
                  name="EmployeeDashboard" 
                  component={EmployeeDashboard}
                  options={{ 
                    title: 'Employee Dashboard',
                    headerRight: () => (
                      <View className="mr-4">
                        <Text 
                          className="text-white text-sm"
                          onPress={handleLogout}
                        >
                          Logout
                        </Text>
                      </View>
                    )
                  }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="AttendanceHistory" 
                  component={AttendanceHistory}
                  options={{ title: 'Attendance History' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="CameraScreen" 
                  component={CameraScreen}
                  options={{ title: 'Take Photo' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="AuthMethodSelection" 
                  component={AuthMethodSelection}
                  options={{ title: 'Authentication Settings' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="LeaveRequestScreen" 
                  component={LeaveRequestScreen}
                  options={{ title: 'Leave Requests' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="CalendarScreen" 
                  component={CalendarScreen}
                  options={{ title: 'Calendar' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="ThemeSettingsScreen" 
                  component={ThemeSettingsScreen}
                  options={{ title: 'Theme Settings' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="NotificationsScreen" 
                  component={NotificationsScreen}
                  options={{ title: 'Notifications' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="TicketScreen" 
                  component={TicketScreen}
                  options={{ title: 'My Tickets' }}
                  initialParams={{ user }}
                />
              </>
            ) : (user.role === 'super_admin' || user.role === 'manager') ? (
              <>
                <Stack.Screen 
                  name="AdminDashboard" 
                  component={AdminDashboard}
                  options={{ 
                    title: 'Admin Dashboard',
                    headerRight: () => (
                      <View className="mr-4">
                        <Text 
                          className="text-white text-sm"
                          onPress={handleLogout}
                        >
                          Logout
                        </Text>
                      </View>
                    )
                  }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="CalendarScreen" 
                  component={CalendarScreen}
                  options={{ title: 'Calendar' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="ThemeSettingsScreen" 
                  component={ThemeSettingsScreen}
                  options={{ title: 'Theme Settings' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="NotificationsScreen" 
                  component={NotificationsScreen}
                  options={{ title: 'Notifications' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="HRDashboard" 
                  component={HRDashboard}
                  options={{ title: 'HR Dashboard' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="TicketManagement" 
                  component={TicketManagementScreen}
                  options={{ title: 'Ticket Management' }}
                  initialParams={{ user }}
                />
                <Stack.Screen 
                  name="ManualAttendance" 
                  component={ManualAttendanceScreen}
                  options={{ title: 'Manual Attendance' }}
                  initialParams={{ user }}
                />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
