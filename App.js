import React from 'react';
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

// Import auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Stack = createStackNavigator();


export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { user, isLoading, handleLogin, handleLogout } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3b82f6',
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
            {user.role === 'employee' ? (
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
              </>
            ) : (
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
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
