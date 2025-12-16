const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db, auth } = require('../config/firebase');

// Firebase Auth REST API configuration
// Used ONLY for password verification (Admin SDK cannot verify passwords)
const FIREBASE_API_KEY = 'AIzaSyByLF4IV7KNfVHkFywimANGoWo_2mpdb2E';
const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

/**
 * POST /api/auth/login
 * Authenticate user with username/email and password
 * Body: { usernameOrEmail: string, password: string }
 * 
 * Implementation:
 * 1. If username, resolve email using Admin SDK + Firestore (trusted backend operation)
 * 2. Verify password using Firebase Auth REST API (signInWithPassword)
 * 3. If authentication succeeds, fetch user data using Admin SDK + Firestore
 * 4. Return user info
 * 
 * Why this approach:
 * - Admin SDK cannot verify passwords, so we use REST API for password verification
 * - Admin SDK is used for Firestore access (trusted backend with admin privileges)
 * - This maintains security while working within Firebase's limitations
 */
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required',
      });
    }

    let email = usernameOrEmail.trim();
    
    // Step 1: If input is a username (not an email), resolve email using Admin SDK + Firestore
    // This is a trusted backend operation with admin privileges
    if (!usernameOrEmail.includes('@')) {
      try {
        // Use Admin SDK to query Firestore (trusted backend operation)
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef
          .where('username', '==', usernameOrEmail)
          .limit(1)
          .get();
        
        if (querySnapshot.empty) {
          console.log('✗ Authentication failed: User not found');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
        
        // Get the first matching user's email
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        email = userData.email;
        
        if (!email) {
          console.log('✗ Authentication failed: No email found for username');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
      } catch (firestoreError) {
        console.error('Firestore query error:', firestoreError.message);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
    
    // Step 2: Verify password using Firebase Auth REST API
    // Admin SDK cannot verify passwords, so we use REST API for this specific operation
    try {
      const authResponse = await axios.post(
        `${FIREBASE_AUTH_URL}?key=${FIREBASE_API_KEY}`,
        {
          email: email,
          password: password,
          returnSecureToken: true,
        }
      );
      
      // Password verification succeeded
      const { localId, email: verifiedEmail } = authResponse.data;
      
      // Step 3: Fetch user data using Admin SDK + Firestore (trusted backend operation)
      const userDoc = await db.collection('users').doc(localId).get();
      
      if (!userDoc.exists) {
        console.log('✗ Authentication failed: User data not found in Firestore');
        return res.status(401).json({
          success: false,
          error: 'User data not found',
        });
      }
      
      const userData = userDoc.data();
      
      console.log('✓ Authentication successful for:', userData.username || verifiedEmail, 'with role:', userData.role);
      
      // Step 4: Return user info
      return res.status(200).json({
        success: true,
        user: {
          uid: localId,
          username: userData.username || verifiedEmail.split('@')[0],
          email: verifiedEmail,
          role: userData.role || 'employee',
          name: userData.name,
          department: userData.department,
          position: userData.position,
          workMode: userData.workMode,
        },
      });
    } catch (authError) {
      // Handle Firebase Auth REST API errors (password verification failures)
      if (authError.response) {
        const errorCode = authError.response.data?.error?.message;
        
        if (errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'INVALID_PASSWORD') {
          console.log('✗ Authentication failed: Invalid credentials');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
        
        if (errorCode === 'USER_DISABLED') {
          console.log('✗ Authentication failed: User disabled');
          return res.status(403).json({
            success: false,
            error: 'This account has been disabled',
          });
        }
        
        if (errorCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
          console.log('✗ Authentication failed: Too many attempts');
          return res.status(429).json({
            success: false,
            error: 'Too many failed attempts. Please try again later',
          });
        }
        
        console.error('Firebase Auth REST API error:', errorCode);
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: errorCode,
        });
      }
      
      throw authError;
    }
  } catch (error) {
    console.error('Login error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/check-username/:username
 * Check if username exists
 */
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    // Query Firestore using Admin SDK
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef
      .where('username', '==', username)
      .limit(1)
      .get();

    return res.status(200).json({
      success: true,
      exists: !querySnapshot.empty,
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/users
 * Create a new user
 * Body: { username, password, email, name, role, department, position, workMode, hireDate }
 */
router.post('/users', async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      name,
      role,
      department,
      position,
      workMode,
      hireDate,
    } = req.body;

    if (!username || !password || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username, password, email, and role are required',
      });
    }

    // Create user in Firebase Auth using Admin SDK
    const firebaseUser = await auth.createUser({
      email: email,
      password: password,
      displayName: name || username,
    });

    // Create user document in Firestore
    await db.collection('users').doc(firebaseUser.uid).set({
      uid: firebaseUser.uid,
      username: username,
      email: email,
      name: name || username,
      role: role,
      department: department || '',
      position: position || '',
      workMode: workMode || 'in_office',
      hireDate: hireDate || new Date().toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('✓ User created:', username, 'with role:', role);

    return res.status(201).json({
      success: true,
      user: {
        uid: firebaseUser.uid,
        username: username,
        email: email,
        role: role,
        name: name || username,
        department: department || '',
        position: position || '',
        workMode: workMode || 'in_office',
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
      });
    }
    
    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/auth/users/:username/role
 * Update user role
 * Body: { role: string }
 */
router.patch('/users/:username/role', async (req, res) => {
  try {
    const { username } = req.params;
    const { role } = req.body;

    if (!username || !role) {
      return res.status(400).json({
        success: false,
        error: 'Username and role are required',
      });
    }

    // Find user by username
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef
      .where('username', '==', username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userUid = userDoc.id;

    // Update role in Firestore
    await db.collection('users').doc(userUid).update({
      role: role,
      updatedAt: new Date().toISOString(),
    });

    console.log('✓ User role updated:', username, 'to', role);

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PATCH /api/auth/users/:username
 * Update user information
 * Body: { ...updates }
 */
router.patch('/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update data is required',
      });
    }

    // Find user by username
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef
      .where('username', '==', username)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userDoc = querySnapshot.docs[0];
    const userUid = userDoc.id;

    // Update user data in Firestore
    updates.updatedAt = new Date().toISOString();
    await db.collection('users').doc(userUid).update(updates);

    console.log('✓ User info updated:', username);

    return res.status(200).json({
      success: true,
      message: 'User information updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

module.exports = router;
