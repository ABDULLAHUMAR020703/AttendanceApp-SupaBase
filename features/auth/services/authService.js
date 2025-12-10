// Authentication Service - Business logic for authentication
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../core/config/firebase';

/**
 * Authenticate user with Firebase
 * Supports both username and email login
 * @param {string} usernameOrEmail - Username or email to authenticate
 * @param {string} password - Password to authenticate
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export const authenticateUser = async (usernameOrEmail, password) => {
  try {
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
    
    console.log('✓ Authentication successful for:', userData.username || email, 'with role:', userData.role);
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
    console.error('Authentication error:', error);
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
 * Create user in Firebase
 * @param {Object} userData - {username, password, email, name, role, department, position, workMode, hireDate}
 * @returns {Promise<{success: boolean, error?: string, uid?: string}>}
 */
export const createUser = async (userData) => {
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
 * @param {Object} updates - Fields to update
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

