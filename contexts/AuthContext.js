import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();
const USER_SESSION_KEY = '@user_session';

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for existing session
    const loadSession = async () => {
      try {
        const sessionData = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (sessionData) {
          setUser(JSON.parse(sessionData));
      }
    } catch (error) {
        console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

    loadSession();
  }, []);

  const handleLogin = async (userData) => {
    try {
    setUser(userData);
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    handleLogin,
    handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
