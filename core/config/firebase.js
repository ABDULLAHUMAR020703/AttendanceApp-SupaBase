// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
// Get these values from your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyByLF4IV7KNfVHkFywimANGoWo_2mpdb2E",
  authDomain: "attendanceapp-8c711.firebaseapp.com",
  projectId: "attendanceapp-8c711",
  storageBucket: "attendanceapp-8c711.firebasestorage.app",
  messagingSenderId: "481410140032",
  appId: "1:481410140032:web:3667cba45c34463259e365",
  measurementId: "G-KTWFRYJSER"
};

let app;
let auth;
let db;

try {
  // Initialize Firebase App
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  // Initialize Firestore
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // For React Native compatibility
  });
  
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.error('✗ Firebase initialization error:', error);
  
  // Fallback initialization if there's an error
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (initError) {
      console.error('✗ Failed to initialize Firebase app:', initError);
    }
  }
  
  if (app && !auth) {
    try {
      auth = getAuth(app);
    } catch (authError) {
      console.error('✗ Failed to initialize Firebase auth:', authError);
    }
  }
  
  if (app && !db) {
    try {
      db = getFirestore(app);
    } catch (dbError) {
      console.error('✗ Failed to initialize Firestore:', dbError);
    }
  }
}

// Ensure app is initialized before exporting
if (!app) {
  console.error('✗ Firebase app was not initialized!');
}

export { auth, db, app };
