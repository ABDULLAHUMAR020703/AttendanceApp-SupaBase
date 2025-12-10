import React, { useEffect } from 'react';

// Core providers
import { AuthProvider } from './core/contexts/AuthContext';
import { ThemeProvider } from './core/contexts/ThemeContext';

// Navigation
import AppNavigator from './core/navigation/AppNavigator';

// Import employee initialization
import { initializeDefaultEmployees } from './utils/employees';

/**
 * Main App Component
 * 
 * This is the root component of the application.
 * It sets up the core providers (Theme, Auth) and initializes the navigation.
 * 
 * Architecture:
 * - Core providers wrap the entire app
 * - AppNavigator handles routing based on auth state
 * - Features are organized in feature modules
 */
export default function App() {
  useEffect(() => {
    // Initialize default employees when app starts
    // Firebase handles authentication automatically - no file initialization needed
    const initializeApp = async () => {
      await initializeDefaultEmployees();
    };
    initializeApp();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
