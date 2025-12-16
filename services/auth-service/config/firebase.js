// Firebase Admin SDK Configuration
// This is a trusted backend service with admin privileges
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase project configuration
const firebaseConfig = {
  projectId: 'attendanceapp-8c711',
};

// Initialize Firebase Admin SDK
// Uses applicationDefault credentials from environment variables
let initialized = false;

try {
  // Check if Firebase Admin is already initialized
  if (admin.apps.length === 0) {
    // Initialize with applicationDefault credentials
    // Credentials are read from environment variables:
    // - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON file)
    // - Or individual credential fields (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, etc.)
    
    let credential;
    
    // Option 1: Use service account JSON file path from environment variable
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      credential = admin.credential.cert(serviceAccount);
    }
    // Option 2: Use individual credential fields from environment variables
    else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: firebaseConfig.projectId,
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }
    // Option 3: Use applicationDefault (for GCP environments)
    else {
      credential = admin.credential.applicationDefault();
    }
    
    admin.initializeApp({
      credential: credential,
      projectId: firebaseConfig.projectId,
    });
    
    initialized = true;
    console.log('✓ Firebase Admin SDK initialized successfully');
  } else {
    initialized = true;
    console.log('✓ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('✗ Firebase Admin SDK initialization error:', error.message);
  console.error('Please ensure service account credentials are configured.');
  console.error('See services/auth-service/README.md for setup instructions.');
  initialized = false;
}

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth,
  initialized,
};

