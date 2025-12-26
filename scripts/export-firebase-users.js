/**
 * Export Users from Firebase Firestore
 * 
 * This script exports all users from Firebase Firestore to a JSON file
 * Run with: node scripts/export-firebase-users.js
 * 
 * Requirements:
 * - Firebase Admin SDK credentials configured
 * - GOOGLE_APPLICATION_CREDENTIALS environment variable set
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'services', 'auth-service', '.env') });

// Initialize Firebase Admin SDK
let db;
let auth;

try {
  // Check if Firebase Admin is already initialized
  if (admin.apps.length === 0) {
    let credential;
    
    // Option 1: Use service account JSON file
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      credential = admin.credential.cert(serviceAccount);
    }
    // Option 2: Use individual credential fields
    else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: 'attendanceapp-8c711',
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }
    // Option 3: Use applicationDefault
    else {
      credential = admin.credential.applicationDefault();
    }
    
    admin.initializeApp({
      credential: credential,
      projectId: 'attendanceapp-8c711',
    });
    
    console.log('✓ Firebase Admin SDK initialized');
  }
  
  db = admin.firestore();
  auth = admin.auth();
} catch (error) {
  console.error('✗ Firebase Admin SDK initialization error:', error.message);
  console.error('Please ensure service account credentials are configured.');
  process.exit(1);
}

/**
 * Export all users from Firestore
 */
async function exportUsers() {
  try {
    console.log('\n🔄 Exporting users from Firebase Firestore...\n');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('⚠️  No users found in Firestore');
      return [];
    }
    
    console.log(`📋 Found ${usersSnapshot.size} users in Firestore\n`);
    
    const users = [];
    const errors = [];
    
    // Process each user
    for (const doc of usersSnapshot.docs) {
      try {
        const userData = doc.data();
        const uid = doc.id;
        
        // Get Firebase Auth user info (email, etc.)
        let authUser = null;
        try {
          authUser = await auth.getUser(uid);
        } catch (error) {
          console.warn(`⚠️  Warning: User ${uid} not found in Firebase Auth: ${error.message}`);
        }
        
        // Map Firestore data to export format
        const exportUser = {
          // Firebase Auth UID
          uid: uid,
          
          // User data from Firestore
          username: userData.username || '',
          email: authUser?.email || userData.email || '',
          name: userData.name || userData.username || '',
          role: userData.role || 'employee',
          department: userData.department || '',
          position: userData.position || '',
          
          // Map camelCase to snake_case for Supabase
          work_mode: userData.workMode || userData.work_mode || 'in_office',
          hire_date: userData.hireDate || userData.hire_date || null,
          is_active: userData.isActive !== undefined ? userData.isActive : (userData.is_active !== undefined ? userData.is_active : true),
          
          // Timestamps
          created_at: userData.createdAt || userData.created_at || new Date().toISOString(),
          updated_at: userData.updatedAt || userData.updated_at || new Date().toISOString(),
          
          // Metadata
          firebase_auth_email: authUser?.email || null,
          firebase_auth_created: authUser?.metadata?.creationTime || null,
        };
        
        users.push(exportUser);
        console.log(`✓ Exported: ${exportUser.username} (${exportUser.email})`);
        
      } catch (error) {
        errors.push({ uid: doc.id, error: error.message });
        console.error(`✗ Error exporting user ${doc.id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully exported ${users.length} users`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors occurred`);
    }
    
    return { users, errors };
    
  } catch (error) {
    console.error('✗ Export error:', error);
    throw error;
  }
}

/**
 * Save exported users to JSON file
 */
async function saveToFile(users, errors) {
  const outputDir = path.join(__dirname, '..', 'migrations', 'data');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `firebase-users-export-${timestamp}.json`);
  
  const exportData = {
    exported_at: new Date().toISOString(),
    total_users: users.length,
    users: users,
    errors: errors
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`\n💾 Exported data saved to: ${outputFile}`);
  
  return outputFile;
}

/**
 * Main export function
 */
async function main() {
  try {
    const { users, errors } = await exportUsers();
    
    if (users.length === 0) {
      console.log('\n⚠️  No users to export');
      process.exit(0);
    }
    
    const outputFile = await saveToFile(users, errors);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Export Summary');
    console.log('='.repeat(60));
    console.log(`✅ Exported: ${users.length} users`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`💾 Output file: ${outputFile}`);
    console.log('='.repeat(60) + '\n');
    
    console.log('📝 Next steps:');
    console.log('1. Review the exported JSON file');
    console.log('2. Run: node scripts/import-to-supabase.js');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export
main();

