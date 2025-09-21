import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserSession, clearUserSession } from '../utils/storage';
import { initializeUsersFile } from '../utils/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize users file
      await initializeUsersFile();
      
      // Check for existing user session
      const userSession = await getUserSession();
      if (userSession) {
        setUser(userSession);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await clearUserSession();
    setUser(null);
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
