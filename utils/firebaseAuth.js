// Firebase Authentication Utilities
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userData?.name || email.split('@')[0],
        role: userData?.role || 'employee',
        username: userData?.username || email.split('@')[0]
      }
    };
  } catch (error) {
    console.error('Sign in error:', error);
    let errorMessage = 'Failed to sign in';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
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
        errorMessage = error.message || 'Failed to sign in';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Sign up new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User full name
 * @param {string} role - User role (employee or admin)
 * @param {Object} additionalData - Additional user data
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export const signUp = async (email, password, name, role = 'employee', additionalData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, {
      displayName: name
    });
    
    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: user.email,
      name: name,
      username: email.split('@')[0],
      role: role,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...additionalData
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: role,
        username: userData.username
      }
    };
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Failed to create account';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters';
        break;
      default:
        errorMessage = error.message || 'Failed to create account';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Sign out current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    };
  }
};

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Listen to authentication state changes
 * @param {Function} callback - Callback function called when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Get user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || userData?.name || firebaseUser.email.split('@')[0],
          role: userData?.role || 'employee',
          username: userData?.username || firebaseUser.email.split('@')[0]
        });
      } catch (error) {
        console.error('Error getting user data:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    let errorMessage = 'Failed to send password reset email';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      default:
        errorMessage = error.message || 'Failed to send password reset email';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Sign in with Google
 * Note: You need to configure Google OAuth in Firebase Console
 * Get the Web Client ID from: Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
 * @param {string} webClientId - Google OAuth Web Client ID (optional, will try to get from Firebase)
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
export const signInWithGoogle = async (webClientId = null) => {
  try {
    // You need to get the Web Client ID from Firebase Console
    // Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
    // It looks like: 123456789-abcdefghijklmnop.apps.googleusercontent.com
    // For now, you can construct it from projectId or pass it directly
    // The format is: {projectId}.apps.googleusercontent.com
    // But you should get the actual Web Client ID from Firebase Console
    
    // Try to get from Firebase config or use provided one
    let clientId = webClientId;
    
    if (!clientId) {
      // Default Web Client ID from Firebase Console
      // Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
      clientId = '838415769951-pfb0bqqc6je7bib3vfnl6m882g77qa7n.apps.googleusercontent.com';
    }
    
    // Create OAuth request
    const request = new AuthSession.AuthRequest({
      clientId: clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: AuthSession.makeRedirectUri({
        useProxy: true,
      }),
    });

    // Get discovery document
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Start the auth session
    const result = await request.promptAsync(discovery, {
      useProxy: true,
    });

    if (result.type === 'success') {
      const { id_token } = result.params;
      
      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(id_token);
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;
      
      // Check if user document exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create user document in Firestore
        const userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          username: user.email?.split('@')[0] || 'user',
          role: 'employee', // Default role, can be updated by admin
          createdAt: new Date().toISOString(),
          isActive: true,
          provider: 'google'
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
      } else {
        // Update existing user document
        const existingData = userDoc.data();
        await setDoc(doc(db, 'users', user.uid), {
          ...existingData,
          email: user.email,
          name: user.displayName || existingData.name,
          provider: 'google'
        }, { merge: true });
      }
      
      // Get updated user data
      const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = updatedUserDoc.data();
      
      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || userData?.name || user.email?.split('@')[0],
          role: userData?.role || 'employee',
          username: userData?.username || user.email?.split('@')[0]
        }
      };
    } else {
      return {
        success: false,
        error: 'Google sign-in was cancelled'
      };
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    let errorMessage = 'Failed to sign in with Google';
    
    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        errorMessage = 'An account already exists with a different sign-in method';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid Google credentials';
        break;
      default:
        errorMessage = error.message || 'Failed to sign in with Google';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Update user profile
 * @param {Object} updates - Profile updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'No user signed in' };
    }
    
    if (updates.displayName) {
      await updateProfile(user, {
        displayName: updates.displayName
      });
    }
    
    // Update Firestore document
    if (Object.keys(updates).length > 0) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    };
  }
};


