/**
 * Import Users to Supabase
 * 
 * This script imports users from exported Firebase JSON to Supabase
 * Run with: node scripts/import-to-supabase.js
 * 
 * Requirements:
 * - Supabase credentials in services/auth-service/.env
 * - Exported JSON file from export-firebase-users.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'services', 'auth-service', '.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in services/auth-service/.env');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Find the latest export file
 */
function findLatestExportFile() {
  const dataDir = path.join(__dirname, '..', 'migrations', 'data');
  
  if (!fs.existsSync(dataDir)) {
    console.error('❌ Migrations data directory not found');
    console.error('Please run export-firebase-users.js first');
    process.exit(1);
  }
  
  const files = fs.readdirSync(dataDir)
    .filter(file => file.startsWith('firebase-users-export-') && file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(dataDir, file),
      time: fs.statSync(path.join(dataDir, file)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) {
    console.error('❌ No export files found');
    console.error('Please run export-firebase-users.js first');
    process.exit(1);
  }
  
  return files[0].path;
}

/**
 * Load exported users from JSON file
 */
function loadExportedUsers(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📖 Loaded export file: ${path.basename(filePath)}`);
    console.log(`📋 Found ${data.users.length} users to import\n`);
    return data.users;
  } catch (error) {
    console.error('❌ Error reading export file:', error.message);
    process.exit(1);
  }
}

/**
 * Create user in Supabase Auth
 * Note: Passwords cannot be migrated - users will need to reset password
 */
async function createSupabaseAuthUser(user) {
  try {
    // Check if user already exists in Supabase Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.warn(`⚠️  Could not check existing users: ${listError.message}`);
    } else {
      const existing = existingUsers.users.find(u => u.email === user.email);
      if (existing) {
        console.log(`   ℹ️  User already exists in Supabase Auth: ${user.email}`);
        return { success: true, userId: existing.id, existing: true };
      }
    }
    
    // Create user in Supabase Auth
    // Note: We cannot migrate passwords, so we'll create with a temporary password
    // Users will need to reset their password on first login
    const tempPassword = `TempPass${Math.random().toString(36).slice(-8)}!`;
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: user.username,
        name: user.name,
        migrated_from_firebase: true
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        // User exists, try to get it
        const { data: users } = await supabase.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === user.email);
        if (existing) {
          return { success: true, userId: existing.id, existing: true };
        }
      }
      throw authError;
    }
    
    return { 
      success: true, 
      userId: authUser.user.id,
      existing: false,
      tempPassword: tempPassword // Store for user notification
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      userId: null
    };
  }
}

/**
 * Insert user into Supabase database
 */
async function insertUserToDatabase(user, supabaseUserId) {
  try {
    // Prepare user data for Supabase
    const userData = {
      uid: supabaseUserId, // Use Supabase Auth user ID as uid
      username: user.username,
      email: user.email,
      name: user.name || user.username,
      role: user.role || 'employee',
      department: user.department || '',
      position: user.position || '',
      work_mode: user.work_mode || 'in_office',
      hire_date: user.hire_date || null,
      is_active: user.is_active !== undefined ? user.is_active : true,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString()
    };
    
    // Insert into users table
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select();
    
    if (error) {
      // If user already exists, try to update
      if (error.code === '23505') { // Unique violation
        console.log(`   ℹ️  User already exists in database, updating...`);
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('username', user.username)
          .select();
        
        if (updateError) {
          throw updateError;
        }
        
        return { success: true, data: updated[0], updated: true };
      }
      throw error;
    }
    
    return { success: true, data: data[0], updated: false };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Import users to Supabase
 */
async function importUsers(users) {
  console.log('🚀 Starting import to Supabase...\n');
  console.log('='.repeat(60));
  
  const results = [];
  const passwordResetUsers = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      console.log(`[${i + 1}/${users.length}] Importing: ${user.username} (${user.email})...`);
      
      // Step 1: Create user in Supabase Auth
      const authResult = await createSupabaseAuthUser(user);
      
      if (!authResult.success) {
        results.push({
          username: user.username,
          email: user.email,
          success: false,
          error: `Auth creation failed: ${authResult.error}`
        });
        console.log(`   ❌ Failed: ${authResult.error}`);
        continue;
      }
      
      if (!authResult.existing && authResult.tempPassword) {
        passwordResetUsers.push({
          username: user.username,
          email: user.email,
          tempPassword: authResult.tempPassword
        });
      }
      
      // Step 2: Insert user into database
      const dbResult = await insertUserToDatabase(user, authResult.userId);
      
      if (!dbResult.success) {
        results.push({
          username: user.username,
          email: user.email,
          success: false,
          error: `Database insert failed: ${dbResult.error}`
        });
        console.log(`   ❌ Failed: ${dbResult.error}`);
        continue;
      }
      
      results.push({
        username: user.username,
        email: user.email,
        success: true,
        userId: authResult.userId
      });
      
      const action = dbResult.updated ? 'Updated' : 'Created';
      console.log(`   ✅ ${action}: ${user.username} - ${user.email}`);
      
      // Add small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      results.push({
        username: user.username,
        email: user.email,
        success: false,
        error: error.message
      });
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Total: ${results.length}`);
  
  if (failCount > 0) {
    console.log(`\n❌ Failed users:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.username} (${r.email}): ${r.error}`);
    });
  }
  
  if (passwordResetUsers.length > 0) {
    console.log(`\n⚠️  Password Reset Required:`);
    console.log(`   ${passwordResetUsers.length} users were created with temporary passwords.`);
    console.log(`   They will need to reset their passwords on first login.`);
    console.log(`\n   Temporary passwords saved to: migrations/data/password-reset-info.json`);
    
    // Save password reset info (for admin use only)
    const passwordResetFile = path.join(__dirname, '..', 'migrations', 'data', 'password-reset-info.json');
    fs.writeFileSync(
      passwordResetFile,
      JSON.stringify({
        note: 'These are temporary passwords. Users should reset them on first login.',
        users: passwordResetUsers.map(u => ({
          username: u.username,
          email: u.email,
          // Don't save password in production - this is just for migration
          tempPassword: u.tempPassword
        }))
      }, null, 2),
      'utf-8'
    );
  }
  
  console.log('='.repeat(60) + '\n');
  
  return { results, passwordResetUsers };
}

/**
 * Main import function
 */
async function main() {
  try {
    // Find latest export file
    const exportFile = findLatestExportFile();
    
    // Load exported users
    const users = loadExportedUsers(exportFile);
    
    if (users.length === 0) {
      console.log('⚠️  No users to import');
      process.exit(0);
    }
    
    // Import users
    const { results, passwordResetUsers } = await importUsers(users);
    
    // Save import results
    const resultsFile = path.join(__dirname, '..', 'migrations', 'data', 'import-results.json');
    fs.writeFileSync(
      resultsFile,
      JSON.stringify({
        imported_at: new Date().toISOString(),
        results: results,
        summary: {
          total: results.length,
          success: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }, null, 2),
      'utf-8'
    );
    
    console.log(`💾 Import results saved to: ${resultsFile}\n`);
    
    if (results.filter(r => !r.success).length > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
main();

