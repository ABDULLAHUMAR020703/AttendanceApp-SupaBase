import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { getEmployeeByUsername } from '../../utils/employees';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async (userId) => {
    try {
      // Get user data from Supabase database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();
      
      if (userError || !userData) {
        console.error('Error loading user data:', userError);
        // Fallback to basic user info from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            uid: authUser.id,
            email: authUser.email,
            username: authUser.email?.split('@')[0],
            role: 'employee',
          });
        }
        setIsLoading(false);
        return;
      }
      
      // Try to get employee data for additional info
      let employee = null;
      if (userData.username) {
        try {
          employee = await getEmployeeByUsername(userData.username);
        } catch (error) {
          console.log('Employee not found, using database data only');
        }
      }
      
      // Get current auth user for email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Combine Supabase user with database data and employee data
      const combinedUser = {
        uid: userId,
        email: authUser?.email || userData.email,
        username: userData.username || authUser?.email?.split('@')[0],
        role: userData.role || 'employee',
        name: userData.name || employee?.name || authUser?.user_metadata?.name,
        department: userData.department || employee?.department || '',
        position: userData.position || employee?.position || '',
        workMode: userData.work_mode || employee?.workMode || 'in_office',
        hireDate: userData.hire_date || employee?.hireDate,
        id: employee?.id || userId,
      };
      
      setUser(combinedUser);
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to basic user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          uid: authUser.id,
          email: authUser.email,
          username: authUser.email?.split('@')[0],
          role: 'employee',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    // Login is handled by Supabase Auth, this is just for compatibility
    // The actual login happens in LoginScreen using Supabase
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
