import * as FileSystem from 'expo-file-system/legacy';

/**
 * Parse users.txt file and authenticate user
 * @param {string} username - Username to authenticate
 * @param {string} password - Password to authenticate
 * @returns {Promise<{success: boolean, user?: {username: string, role: string}}>}
 */
export const authenticateUser = async (username, password) => {
  try {
    // Read the users.txt file from document directory
    const usersFilePath = `${FileSystem.documentDirectory}users.txt`;
    const fileExists = await FileSystem.getInfoAsync(usersFilePath);
    
    let fileContent;
    if (fileExists.exists) {
      fileContent = await FileSystem.readAsStringAsync(usersFilePath);
    } else {
      // If file doesn't exist, use default content
      fileContent = `testuser,password:testuser123,role:employee
testadmin,password:testadmin123,role:admin`;
    }
    const lines = fileContent.trim().split('\n');
    
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const fileUsername = parts[0].trim();
        const passwordPart = parts[1].trim();
        const rolePart = parts[2].trim();
        
        // Extract password and role
        const passwordMatch = passwordPart.match(/password:(.+)/);
        const roleMatch = rolePart.match(/role:(.+)/);
        
        if (passwordMatch && roleMatch) {
          const filePassword = passwordMatch[1];
          const role = roleMatch[1];
          
          if (fileUsername === username && filePassword === password) {
            return {
              success: true,
              user: {
                username: fileUsername,
                role: role
              }
            };
          }
        }
      }
    }
    
    return { success: false };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false };
  }
};

/**
 * Initialize users.txt file in document directory
 */
export const initializeUsersFile = async () => {
  try {
    const usersFilePath = `${FileSystem.documentDirectory}users.txt`;
    const fileExists = await FileSystem.getInfoAsync(usersFilePath);
    
    if (!fileExists.exists) {
      // Create the users.txt file with default credentials
      const defaultUsers = `testuser,password:testuser123,role:employee
testadmin,password:testadmin123,role:admin`;
      
      await FileSystem.writeAsStringAsync(usersFilePath, defaultUsers);
      console.log('Users file initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing users file:', error);
  }
};
