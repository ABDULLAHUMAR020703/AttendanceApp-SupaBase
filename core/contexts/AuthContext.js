import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getEmployeeByUsername } from '../../utils/employees';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();
          
          if (userData) {
            // Try to get employee data for additional info
            let employee = null;
            if (userData.username) {
              try {
                employee = await getEmployeeByUsername(userData.username);
              } catch (error) {
                console.log('Employee not found, using Firestore data only');
              }
            }
            
            // Combine Firebase user with Firestore data and employee data
            // Firestore now contains all fields, so prioritize Firestore data
            const combinedUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: userData.username || firebaseUser.email?.split('@')[0],
              role: userData.role || 'employee',
              name: userData.name || employee?.name || firebaseUser.displayName,
              department: userData.department || employee?.department || '',
              position: userData.position || employee?.position || '',
              workMode: userData.workMode || employee?.workMode || 'in_office',
              hireDate: userData.hireDate || employee?.hireDate,
              id: employee?.id || firebaseUser.uid,
            };
            
            setUser(combinedUser);
          } else {
            // Fallback if Firestore document doesn't exist
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email?.split('@')[0],
              role: 'employee',
            });
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          // Fallback to basic Firebase user
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email?.split('@')[0],
            role: 'employee',
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (userData) => {
    // Login is handled by Firebase Auth, this is just for compatibility
    // The actual login happens in LoginScreen using Firebase
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
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
