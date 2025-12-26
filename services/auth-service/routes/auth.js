const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

/**
 * POST /api/auth/login
 * Authenticate user with username/email and password
 * Body: { usernameOrEmail: string, password: string }
 * 
 * Implementation:
 * 1. If username, resolve email using Supabase database query
 * 2. Authenticate using Supabase Auth (signInWithPassword)
 * 3. Fetch user data from Supabase database
 * 4. Return user info
 */
router.post('/login', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Auth Service: Login request received for:`, req.body.usernameOrEmail || 'unknown');
  
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      console.log(`[${timestamp}] Auth Service: Login failed - missing credentials`);
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required',
      });
    }

    let email = usernameOrEmail.trim();
    
    // Step 1: If input is a username (not an email), resolve email using Supabase
    if (!usernameOrEmail.includes('@')) {
      try {
        // Query Supabase database for user by username
        const { data: userData, error: queryError } = await supabase
          .from('users')
          .select('email, username')
          .eq('username', usernameOrEmail)
          .limit(1)
          .single();
        
        if (queryError || !userData) {
          console.log('✗ Authentication failed: User not found');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
        
        email = userData.email;
        
        if (!email) {
          console.log('✗ Authentication failed: No email found for username');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
      } catch (queryError) {
        console.error('Database query error:', queryError.message);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
    
    // Step 2: Authenticate using Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (authError || !authData.user) {
        // Handle authentication errors
        if (authError?.message?.includes('Invalid login credentials') || 
            authError?.message?.includes('Email not confirmed')) {
          console.log('✗ Authentication failed: Invalid credentials');
          return res.status(401).json({
            success: false,
            error: 'Invalid username or password',
          });
        }
        
        if (authError?.message?.includes('Email rate limit exceeded')) {
          console.log('✗ Authentication failed: Too many attempts');
          return res.status(429).json({
            success: false,
            error: 'Too many failed attempts. Please try again later',
          });
        }
        
        console.error('Supabase Auth error:', authError?.message);
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: authError?.message,
        });
      }
      
      const userId = authData.user.id;
      
      // Step 3: Fetch user data from Supabase database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();
      
      if (userError || !userData) {
        console.log('✗ Authentication failed: User data not found in database');
        return res.status(401).json({
          success: false,
          error: 'User data not found',
        });
      }
      
      console.log(`[${timestamp}] Auth Service: ✓ Authentication successful for:`, userData.username || email, 'with role:', userData.role);
      
      // Step 4: Return user info
      return res.status(200).json({
        success: true,
        user: {
          uid: userId,
          username: userData.username || email.split('@')[0],
          email: userData.email || email,
          role: userData.role || 'employee',
          name: userData.name,
          department: userData.department || '',
          position: userData.position || '',
          workMode: userData.work_mode || 'in_office',
        },
      });
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: authError.message,
      });
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
  const timestamp = new Date().toISOString();
  const { username } = req.params;
  console.log(`[${timestamp}] Auth Service: Check username request for: ${username}`);
  
  try {
    if (!username) {
      console.log(`[${timestamp}] Auth Service: Check username failed - username missing`);
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    // Query Supabase database
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .limit(1);

    if (error) {
      console.error('Check username error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }

    return res.status(200).json({
      success: true,
      exists: data && data.length > 0,
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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Auth Service: Create user request received for:`, req.body.username || 'unknown');
  
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
      console.log(`[${timestamp}] Auth Service: Create user failed - missing required fields`);
      return res.status(400).json({
        success: false,
        error: 'Username, password, email, and role are required',
      });
    }

    // Create user in Supabase Auth using Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: username,
        name: name || username,
      },
    });

    if (authError) {
      // Handle Supabase Auth errors
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists',
        });
      }
      
      if (authError.message?.includes('Invalid email')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email address',
        });
      }
      
      console.error('Create user auth error:', authError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: authError.message,
      });
    }

    // Create user document in Supabase database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        uid: authUser.user.id,
        username: username,
        email: email,
        name: name || username,
        role: role,
        department: department || '',
        position: position || '',
        work_mode: workMode || 'in_office',
        hire_date: hireDate || new Date().toISOString().split('T')[0],
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      console.error('Create user database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user profile',
        message: dbError.message,
      });
    }

    console.log(`[${timestamp}] Auth Service: ✓ User created:`, username, 'with role:', role);

    return res.status(201).json({
      success: true,
      user: {
        uid: authUser.user.id,
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
  const timestamp = new Date().toISOString();
  const { username } = req.params;
  const { role } = req.body;
  console.log(`[${timestamp}] Auth Service: Update role request for: ${username} -> ${role}`);
  
  try {
    if (!username || !role) {
      console.log(`[${timestamp}] Auth Service: Update role failed - missing username or role`);
      return res.status(400).json({
        success: false,
        error: 'Username and role are required',
      });
    }

    // Update role in Supabase database
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('username', username)
      .select();

    if (error) {
      console.error('Update role error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    console.log(`[${timestamp}] Auth Service: ✓ User role updated:`, username, 'to', role);

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
  const timestamp = new Date().toISOString();
  const { username } = req.params;
  const updates = req.body;
  console.log(`[${timestamp}] Auth Service: Update user request for: ${username}`, { updates: Object.keys(updates) });
  
  try {
    if (!username) {
      console.log(`[${timestamp}] Auth Service: Update user failed - username missing`);
      return res.status(400).json({
        success: false,
        error: 'Username is required',
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      console.log(`[${timestamp}] Auth Service: Update user failed - no update data`);
      return res.status(400).json({
        success: false,
        error: 'Update data is required',
      });
    }

    // Convert camelCase to snake_case for database fields
    const dbUpdates = {};
    if (updates.workMode !== undefined) {
      dbUpdates.work_mode = updates.workMode;
    }
    if (updates.hireDate !== undefined) {
      dbUpdates.hire_date = updates.hireDate;
    }
    if (updates.isActive !== undefined) {
      dbUpdates.is_active = updates.isActive;
    }
    
    // Copy other fields as-is (they should already be in correct format)
    Object.keys(updates).forEach(key => {
      if (!['workMode', 'hireDate', 'isActive'].includes(key)) {
        dbUpdates[key] = updates[key];
      }
    });
    
    dbUpdates.updated_at = new Date().toISOString();

    // Update user data in Supabase database
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('username', username)
      .select();

    if (error) {
      console.error('Update user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    console.log(`[${timestamp}] Auth Service: ✓ User info updated:`, username);

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
