import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { getEmployeeByUsername } from '../../utils/employees';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
          // If refresh token error, clear session
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            console.log('Invalid refresh token detected, clearing session...');
            supabase.auth.signOut().catch(console.error);
          }
          setIsLoading(false);
          return;
        }
        
        if (session) {
          loadUserData(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error in getSession:', error);
        setIsLoading(false);
      });

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'has session' : 'no session');
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData(session.user.id);
      } else if (!session) {
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
      // First verify the session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error in loadUserData:', sessionError);
        // If refresh token error, sign out
        if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('refresh_token')) {
          console.log('Invalid refresh token, signing out...');
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return;
        }
      }
      
      if (!session) {
        console.log('No active session');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Get auth user email for fallback query
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Error getting auth user:', authError);
        // If refresh token error, sign out
        if (authError.message?.includes('Refresh Token') || authError.message?.includes('refresh_token')) {
          await supabase.auth.signOut();
        }
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Try to get user data from Supabase database
      // First try by uid (should match Supabase Auth user ID)
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();
      
      // If uid query fails, try by email as fallback
      if (userError || !userData) {
        console.log('Query by uid failed, trying by email...', userError?.message);
        if (authUser?.email) {
          const { data: userDataByEmail, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', authUser.email)
            .single();
          
          if (!emailError && userDataByEmail) {
            console.log('Found user by email:', userDataByEmail.username);
            userData = userDataByEmail;
            userError = null;
          } else {
            console.error('Error loading user data by email:', emailError);
          }
        }
      }
      
      if (userError || !userData) {
        console.error('Error loading user data:', userError);
        // Fallback to basic user info from auth
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
      
      // Combine Supabase user with database data and employee data
      // Note: authUser is already available from line 91
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
      
      // Check if it's a refresh token error
      if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token') || error.message?.includes('Invalid Refresh Token')) {
        console.log('Refresh token error detected, signing out...');
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // Fallback to basic user info
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Error getting auth user in catch:', authError);
          if (authError.message?.includes('Refresh Token') || authError.message?.includes('refresh_token')) {
            await supabase.auth.signOut();
          }
          setUser(null);
        } else if (authUser) {
          setUser({
            uid: authUser.id,
            email: authUser.email,
            username: authUser.email?.split('@')[0],
            role: 'employee',
          });
        }
      } catch (getUserError) {
        console.error('Error in getUser fallback:', getUserError);
        setUser(null);
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
