// Firebase Authentication - Migrated from file-based auth
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { API_GATEWAY_URL, API_TIMEOUT } from '../core/config/api';

// Firebase-based authentication - no file storage needed

/**
 * Authenticate user - tries API Gateway first, falls back to Firebase
 * Supports both username and email login
 * @param {string} usernameOrEmail - Username or email to authenticate
 * @param {string} password - Password to authenticate
 * @returns {Promise<{success: boolean, user?: {username: string, role: string}}>}
 */
export const authenticateUser = async (usernameOrEmail, password) => {
  // First, try API Gateway
  try {
    console.log('Attempting authentication via API Gateway...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(`${API_GATEWAY_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernameOrEmail: usernameOrEmail.trim(),
        password: password,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    // If API Gateway returns success, use it
    if (response.ok && data.success) {
      console.log('✓ Authentication successful via API Gateway for:', data.user?.username || usernameOrEmail);
      return {
        success: true,
        user: {
          username: data.user?.username || usernameOrEmail.split('@')[0],
          role: data.user?.role || 'employee',
          uid: data.user?.uid || '',
          email: data.user?.email || usernameOrEmail,
        },
      };
    }
    
    // If API Gateway returns an error (but not a service error), fallback to Firebase
    if (response.status !== 503 && response.status !== 504) {
      console.log('API Gateway returned error, falling back to Firebase:', data.error || 'Unknown error');
      // Continue to Firebase fallback below
    } else {
      // Service unavailable, fallback to Firebase
      console.log('API Gateway unavailable, falling back to Firebase');
      // Continue to Firebase fallback below
    }
  } catch (error) {
    // API Gateway call failed (network error, timeout, etc.), fallback to Firebase
    if (error.name === 'AbortError') {
      console.log('API Gateway request timed out, falling back to Firebase');
    } else {
      // More detailed error logging
      const errorMessage = error.message || 'Unknown error';
      console.log('API Gateway request failed, falling back to Firebase:', errorMessage);
      
      // Log helpful debugging info
      if (__DEV__) {
        console.log('API Gateway URL attempted:', API_GATEWAY_URL);
        console.log('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
        console.log('💡 Tip: Make sure API Gateway is running and URL is correct for your platform');
        console.log('   - iOS Simulator: http://localhost:3000');
        console.log('   - Android Emulator: http://10.0.2.2:3000');
        console.log('   - Physical Device: http://<your-computer-ip>:3000');
      }
    }
    // Continue to Firebase fallback below
  }
  
  // Fallback to Firebase authentication (existing logic)
  try {
    console.log('Attempting authentication via Firebase...');
    let email = usernameOrEmail;
    
    // Check if input is a username (not an email)
    if (!usernameOrEmail.includes('@')) {
      // Find user by username in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', usernameOrEmail));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('✗ Authentication failed: User not found');
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Get the first matching user's email
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      email = userData.email;
      
      if (!email) {
        console.log('✗ Authentication failed: No email found for username');
        return { success: false, error: 'Invalid username or password' };
      }
    }
    
    // Authenticate with Firebase using email
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userData = userDoc.data();
    
    if (!userData) {
      console.log('✗ Authentication failed: User data not found');
      return { success: false, error: 'User data not found' };
    }
    
    console.log('✓ Authentication successful via Firebase for:', userData.username || email, 'with role:', userData.role);
    return {
      success: true,
      user: {
        username: userData.username || email.split('@')[0],
        role: userData.role || 'employee',
        uid: firebaseUser.uid,
        email: firebaseUser.email
      }
    };
  } catch (error) {
    console.error('Firebase authentication error:', error);
    let errorMessage = 'Invalid username or password';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this username/email';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later';
        break;
      default:
        errorMessage = error.message || 'Authentication failed';
    }
    
    return { success: false, error: errorMessage };
  }
};

/**
 * Check if username exists in Firebase
 * @param {string} username
 * @returns {Promise<boolean>}
 */
export const checkUsernameExists = async (username) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

/**
 * Create user in Firebase (replaces addUserToFile)
 * @param {Object} userData - {username, password, email, name, role, department, position, workMode, hireDate}
 * @returns {Promise<{success: boolean, error?: string, uid?: string}>}
 */
export const addUserToFile = async (userData) => {
  try {
    const { 
      username, 
      password, 
      email, 
      name, 
      role,
      department = '',
      position = '',
      workMode = 'in_office',
      hireDate = new Date().toISOString().split('T')[0]
    } = userData;
    
    if (!username || !password || !role) {
      return { success: false, error: 'Username, password, and role are required' };
    }
    
    if (!email) {
      return { success: false, error: 'Email is required for Firebase authentication' };
    }
    
    // Check if username already exists
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return { success: false, error: 'Username already exists' };
    }
    
    // Check if email already exists in Firebase Auth
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user document in Firestore with all fields
      const userDocData = {
        uid: firebaseUser.uid,
        username,
        email,
        name: name || username,
        role,
        department: department || '',
        position: position || '',
        workMode: workMode || 'in_office',
        hireDate: hireDate || new Date().toISOString().split('T')[0],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);
      
      console.log('✓ User created in Firebase:', username, `(${role}, ${department || 'No dept'})`);
      return { success: true, uid: firebaseUser.uid };
    } catch (error) {
      console.error('Error creating Firebase user:', error);
      let errorMessage = 'Failed to create user';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already exists';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      }
      
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    console.error('Error adding user:', error);
    return { success: false, error: error.message || 'Failed to add user' };
  }
};

/**
 * Update user role in Firebase
 * @param {string} username - Username to update
 * @param {string} newRole - New role
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserRole = async (username, newRole) => {
  try {
    // Find user by username in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'User not found' };
    }
    
    // Update the user's role
    const userDoc = querySnapshot.docs[0];
    await setDoc(doc(db, 'users', userDoc.id), {
      role: newRole,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('✓ User role updated in Firebase:', username, '->', newRole);
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error.message || 'Failed to update user role' };
  }
};

/**
 * Update user information in Firebase
 * @param {string} username - Username to update
 * @param {Object} updates - Fields to update (department, position, workMode, hireDate, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserInfo = async (username, updates) => {
  try {
    // Find user by username in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'User not found' };
    }
    
    // Update the user's information
    const userDoc = querySnapshot.docs[0];
    await setDoc(doc(db, 'users', userDoc.id), {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('✓ User info updated in Firebase:', username);
    return { success: true };
  } catch (error) {
    console.error('Error updating user info:', error);
    return { success: false, error: error.message || 'Failed to update user info' };
  }
};

/**
 * Initialize Firebase users (migrated from file-based)
 * This function is kept for compatibility but does nothing now
 * Firebase handles user initialization automatically
 */
export const initializeUsersFile = async () => {
  console.log('✓ Firebase authentication initialized (no file storage needed)');
};
