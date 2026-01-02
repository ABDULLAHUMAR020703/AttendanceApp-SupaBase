/**
 * Automated User Creation Script for New Users
 * 
 * This script:
 * 1. Reads users from new_users.txt
 * 2. Deletes all existing users (optional)
 * 3. Creates users in Supabase Auth
 * 4. Inserts users into the users table
 * 
 * Run with: node scripts/create-new-users-automated.js
 * 
 * Requirements:
 * - Supabase credentials in services/auth-service/.env
 * - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set
 * - new_users.txt file in project root
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Try to load from project root node_modules first, then auth-service
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  try {
    createClient = require(path.join(__dirname, '..', 'services', 'auth-service', 'node_modules', '@supabase', 'supabase-js')).createClient;
  } catch (e2) {
    console.error('❌ Cannot find @supabase/supabase-js');
    console.error('Please install it: npm install @supabase/supabase-js dotenv');
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

/**
 * Parse new_users.txt file and extract user information
 */
function parseUsersFile() {
  const filePath = path.join(__dirname, '..', 'new_users.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const users = [];
  let currentDepartment = null;
  
  for (const line of lines) {
    // Check if it's a manager (no indentation) or employee (has indentation)
    const isEmployee = line.startsWith('    ') || line.startsWith('\t');
    const cleanLine = line.trim();
    
    // Skip empty lines
    if (!cleanLine) continue;
    
    // Parse the line
    const parts = cleanLine.split(/\s+/);
    
    if (parts.length < 2) {
      console.warn(`⚠️  Skipping invalid line: ${line}`);
      continue;
    }
    
    // Determine role and department
    let name, role, department, position;
    
    // Check for super admin
    if (cleanLine.toLowerCase().includes('super admin')) {
      name = cleanLine.replace(/super\s+admin/gi, '').trim();
      role = 'super_admin';
      department = 'Management';
      position = 'Super Admin';
    }
    // Check for manager (not indented)
    else if (cleanLine.toLowerCase().includes('manager') && !isEmployee) {
      // Try pattern: "Name Department manager" or "Name manager"
      const managerMatch = cleanLine.match(/^(.+?)\s+(Engineering|Technical|Sales|HR|Finance)\s+manager$/i);
      
      if (managerMatch) {
        name = managerMatch[1].trim();
        department = managerMatch[2];
        if (department === 'Technical') {
          department = 'Engineering';
          position = 'Technical Manager';
        } else {
          position = `${department} Manager`;
        }
      } else {
        // Pattern: "Name manager" - extract name before "manager"
        const managerIndex = cleanLine.toLowerCase().indexOf('manager');
        name = cleanLine.substring(0, managerIndex).trim();
        
        // Try to find department in the line
        const deptMatch = cleanLine.match(/\b(Engineering|Technical|Sales|HR|Finance)\b/i);
        if (deptMatch) {
          department = deptMatch[1];
          if (department === 'Technical') {
            department = 'Engineering';
            position = 'Technical Manager';
          } else {
            position = `${department} Manager`;
          }
        } else {
          // Use current department or default
          department = currentDepartment || 'Engineering';
          position = `${department} Manager`;
        }
      }
      
      role = 'manager';
      currentDepartment = department;
    }
    // Employee (indented)
    else {
      // Extract name and position
      // Common patterns:
      // - "Name Associate Engineer"
      // - "Name Senior Technical Associate"
      // - "Name Technical Associate"
      // - "Name Sales Associate"
      
      // Try to match position patterns
      const positionPatterns = [
        { pattern: /Senior\s+Technical\s+Associate/i, name: 'Senior Technical Associate' },
        { pattern: /Technical\s+Associate/i, name: 'Technical Associate' },
        { pattern: /Associate\s+Engineer/i, name: 'Associate Engineer' },
        { pattern: /Sales\s+Associate/i, name: 'Sales Associate' },
        { pattern: /Associate/i, name: 'Associate' }
      ];
      
      let positionFound = false;
      for (const { pattern, name: posName } of positionPatterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          const matchIndex = cleanLine.toLowerCase().indexOf(match[0].toLowerCase());
          name = cleanLine.substring(0, matchIndex).trim();
          position = posName;
          positionFound = true;
          break;
        }
      }
      
      if (!positionFound) {
        // Fallback: last 2 words are position
        name = parts.slice(0, -2).join(' ');
        position = parts.slice(-2).join(' ');
      }
      
      role = 'employee';
      department = currentDepartment || 'Engineering';
    }
    
    // Generate username (lowercase, replace spaces with dots)
    const username = name.toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    
    const email = `${username}@company.com`;
    
    // Generate password (username without dots + "123")
    const password = `${username.replace(/\./g, '')}123`;
    
    // Capitalize name properly (handle "bin", "batt", etc.)
    const nameWords = name.split(' ');
    const capitalizedName = nameWords
      .map(w => {
        const lower = w.toLowerCase();
        // Keep certain words lowercase (bin, batt, etc.)
        if (['bin', 'batt', 'de', 'van', 'von'].includes(lower)) {
          return lower;
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
    
    users.push({
      username,
      email,
      password,
      name: capitalizedName,
      role,
      department,
      position,
      work_mode: 'in_office',
      hire_date: '2024-01-01'
    });
  }
  
  return users;
}

/**
 * Delete all existing users from users table
 */
async function deleteAllUsers() {
  console.log('\n🗑️  Deleting all existing users from database...');
  
  try {
    // Get count first
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Found ${count || 0} existing users`);
    
    if (count === 0) {
      console.log('   ℹ️  No users to delete');
      return true;
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (this condition is always true)
    
    if (error) {
      console.error(`   ❌ Error deleting users: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ Deleted ${count} users from database`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Create user in Supabase Auth
 */
async function createAuthUser(user) {
  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.warn(`   ⚠️  Could not check existing users: ${listError.message}`);
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
        created_via: 'automated_script'
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
 * Ask user a question
 */
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Automated User Creation Script');
  console.log('='.repeat(60));
  
  // Parse users from file
  console.log('\n📖 Reading users from new_users.txt...');
  let users;
  try {
    users = parseUsersFile();
    console.log(`   ✅ Parsed ${users.length} users\n`);
    
    // Display parsed users
    console.log('📋 Parsed Users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.username}) - ${user.role} - ${user.department}`);
    });
  } catch (error) {
    console.error(`   ❌ Error parsing file: ${error.message}`);
    process.exit(1);
  }
  
  // Ask if user wants to delete existing users
  console.log('\n');
  const deleteAnswer = await askQuestion('🗑️  Delete all existing users first? (y/n): ');
  const shouldDelete = deleteAnswer.toLowerCase() === 'y' || deleteAnswer.toLowerCase() === 'yes';
  
  if (shouldDelete) {
    const deleted = await deleteAllUsers();
    if (!deleted) {
      console.log('   ⚠️  Continuing anyway...');
    }
  }
  
  console.log('\n📋 Creating Users...');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      console.log(`\n[${i + 1}/${users.length}] Creating: ${user.name} (${user.username})`);
      console.log(`   Role: ${user.role}, Department: ${user.department}, Position: ${user.position}`);
      
      // Step 1: Create user in Supabase Auth
      console.log(`   🔐 Creating in Supabase Auth...`);
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
      
      console.log(`   ✅ Auth user ${authResult.existing ? 'exists' : 'created'}: ${authResult.userId}`);
      
      // Step 2: Insert user into database
      console.log(`   💾 Inserting into database...`);
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
      
      console.log(`   ✅ ${action} in database`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔑 Password: ${user.password}`);
      
      // Add small delay to avoid rate limiting
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
  
  // Show users by department
  console.log('\n📋 Users by Department:');
  const byDept = {};
  results.filter(r => r.success).forEach(r => {
    const user = users.find(u => u.username === r.username);
    if (user) {
      byDept[user.department] = (byDept[user.department] || 0) + 1;
    }
  });
  Object.entries(byDept).forEach(([dept, count]) => {
    console.log(`   ${dept}: ${count}`);
  });
  
  // Show login credentials
  console.log('\n🔑 Login Credentials:');
  console.log('='.repeat(60));
  users.forEach(user => {
    if (results.find(r => r.username === user.username && r.success)) {
      console.log(`   ${user.username.padEnd(25)} / ${user.password.padEnd(20)} (${user.role})`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ User creation complete!');
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// Run the script
main()
  .then(results => {
    const failed = results.filter(r => !r.success);
    process.exit(failed.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

