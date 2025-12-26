/**
 * Create Users in Supabase (No Firebase Required)
 * 
 * This script creates all demo users in Supabase Auth and Database
 * Run with: node scripts/create-users-supabase.js
 * 
 * Requirements:
 * - Supabase credentials in services/auth-service/.env
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 */

const path = require('path');
const fs = require('fs');

// Try to load from project root node_modules first, then auth-service
let createClient;
try {
  // Try project root node_modules
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  try {
    // Try auth-service node_modules
    createClient = require(path.join(__dirname, '..', 'services', 'auth-service', 'node_modules', '@supabase', 'supabase-js')).createClient;
  } catch (e2) {
    console.error('❌ Cannot find @supabase/supabase-js');
    console.error('Please install it: npm install @supabase/supabase-js dotenv');
    console.error('Or run from services/auth-service directory where it is already installed');
    process.exit(1);
  }
}

// Load dotenv - try multiple locations
const envPaths = [
  path.join(__dirname, '..', 'services', 'auth-service', '.env'),
  path.join(__dirname, '..', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

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

// User data - all demo users from the application
const users = [
  // Super Admin
  {
    username: 'testadmin',
    email: 'testadmin@company.com',
    password: 'testadmin123',
    name: 'Test Admin',
    role: 'super_admin',
    department: 'Management',
    position: 'System Administrator',
    work_mode: 'in_office',
    hire_date: '2023-01-01'
  },
  // Managers
  {
    username: 'hrmanager',
    email: 'hrmanager@company.com',
    password: 'hrmanager123',
    name: 'HR Manager',
    role: 'manager',
    department: 'HR',
    position: 'HR Manager',
    work_mode: 'in_office',
    hire_date: '2022-03-01'
  },
  {
    username: 'techmanager',
    email: 'techmanager@company.com',
    password: 'techmanager123',
    name: 'Tech Manager',
    role: 'manager',
    department: 'Engineering',
    position: 'Engineering Manager',
    work_mode: 'in_office',
    hire_date: '2022-02-15'
  },
  {
    username: 'salesmanager',
    email: 'salesmanager@company.com',
    password: 'salesmanager123',
    name: 'Sales Manager',
    role: 'manager',
    department: 'Sales',
    position: 'Sales Manager',
    work_mode: 'in_office',
    hire_date: '2022-01-20'
  },
  // Employees
  {
    username: 'testuser',
    email: 'testuser@company.com',
    password: 'testuser123',
    name: 'Test User',
    role: 'employee',
    department: 'Engineering',
    position: 'AI Engineer',
    work_mode: 'in_office',
    hire_date: '2023-01-15'
  },
  {
    username: 'john.doe',
    email: 'john.doe@company.com',
    password: 'john123',
    name: 'John Doe',
    role: 'employee',
    department: 'Engineering',
    position: 'Senior AI Engineer',
    work_mode: 'semi_remote',
    hire_date: '2022-06-10'
  },
  {
    username: 'jane.smith',
    email: 'jane.smith@company.com',
    password: 'jane123',
    name: 'Jane Smith',
    role: 'employee',
    department: 'Design',
    position: 'UI/UX Designer',
    work_mode: 'fully_remote',
    hire_date: '2022-08-20'
  },
  {
    username: 'mike.johnson',
    email: 'mike.johnson@company.com',
    password: 'mike123',
    name: 'Mike Johnson',
    role: 'employee',
    department: 'Sales',
    position: 'Sales Manager',
    work_mode: 'in_office',
    hire_date: '2022-03-15'
  },
  {
    username: 'sarah.williams',
    email: 'sarah.williams@company.com',
    password: 'sarah123',
    name: 'Sarah Williams',
    role: 'employee',
    department: 'Marketing',
    position: 'Marketing Specialist',
    work_mode: 'semi_remote',
    hire_date: '2023-02-01'
  },
  {
    username: 'david.brown',
    email: 'david.brown@company.com',
    password: 'david123',
    name: 'David Brown',
    role: 'employee',
    department: 'Engineering',
    position: 'DevOps Engineer',
    work_mode: 'fully_remote',
    hire_date: '2022-11-05'
  },
  {
    username: 'emily.davis',
    email: 'emily.davis@company.com',
    password: 'emily123',
    name: 'Emily Davis',
    role: 'employee',
    department: 'HR',
    position: 'HR Coordinator',
    work_mode: 'in_office',
    hire_date: '2023-04-12'
  }
];

/**
 * Create user in Supabase Auth
 */
async function createAuthUser(user) {
  try {
    // Check if user already exists
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
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: user.username,
        name: user.name,
        created_via: 'manual_script'
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
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
      existing: false
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
    const userData = {
      uid: supabaseUserId,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department || '',
      position: user.position || '',
      work_mode: user.work_mode || 'in_office',
      hire_date: user.hire_date || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
 * Main function to create all users
 */
async function createAllUsers() {
  console.log('\n🚀 Creating Users in Supabase...\n');
  console.log('='.repeat(60));
  console.log(`📋 Total users to create: ${users.length}\n`);
  
  const results = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      console.log(`[${i + 1}/${users.length}] Creating: ${user.username} (${user.email})...`);
      
      // Step 1: Create user in Supabase Auth
      const authResult = await createAuthUser(user);
      
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
      
      const action = dbResult.updated ? 'Updated' : 'Created';
      results.push({
        username: user.username,
        email: user.email,
        success: true,
        userId: authResult.userId
      });
      
      console.log(`   ✅ ${action}: ${user.username} - ${user.email} (${user.role})`);
      
      // Add small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
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
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Creation Summary');
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
  
  // Show users by role
  console.log('\n📋 Users by Role:');
  const byRole = {};
  results.filter(r => r.success).forEach(r => {
    const user = users.find(u => u.username === r.username);
    if (user) {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
    }
  });
  Object.entries(byRole).forEach(([role, count]) => {
    console.log(`   ${role}: ${count}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ User creation complete!');
  console.log('='.repeat(60) + '\n');
  
  console.log('🔑 Login Credentials:');
  console.log('   Super Admin: testadmin / testadmin123');
  console.log('   Manager: techmanager / techmanager123');
  console.log('   Employee: testuser / testuser123');
  console.log('   (See users array in script for all credentials)\n');
  
  return results;
}

// Run the script
createAllUsers()
  .then(results => {
    const failed = results.filter(r => !r.success);
    process.exit(failed.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

