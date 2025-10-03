// Azure Face API Integration for Face Verification
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Azure Face API Configuration
const AZURE_ENDPOINT = 'https://attendance123appface.cognitiveservices.azure.com';
const AZURE_API_KEY = 'DhPDtKyPe1TymAauORFOvpr77f55LB0wPFcpyzbnd6pZDhQnzKFRJQQJ99BJAC3pKaRXJ3w3AAAKACOGXDUA';
const SIMILARITY_THRESHOLD = 0.6; // Confidence threshold for face matching (0-1, higher = more strict)

let modelsLoaded = false;
let referenceFaceIds = new Map(); // Store Azure face IDs for each user

/**
 * Initialize Azure Face API
 * Verifies that the API is accessible with the provided credentials
 */
export const initializeFaceAPI = async () => {
  try {
    if (modelsLoaded) {
      console.log('Azure Face API already initialized');
      return true;
    }

    console.log('Initializing Azure Face API...');
    
    // Test API connectivity with a simple request
    const testResponse = await fetch(`${AZURE_ENDPOINT}/face/v1.0/detect`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/Face/images/detection1.jpg'
      }),
    });

    if (testResponse.ok) {
      modelsLoaded = true;
      console.log('Azure Face API initialized successfully');
      return true;
    } else {
      const errorText = await testResponse.text();
      console.error('Azure Face API initialization failed:', errorText);
      modelsLoaded = false;
      return false;
    }
  } catch (error) {
    console.error('Error initializing Azure Face API:', error);
    modelsLoaded = false;
    return false;
  }
};

/**
 * Detect face in an image using Azure Face API
 * @param {string} imageUri - URI of the image to detect face in
 * @returns {Promise<{faceId: string, faceRectangle: object} | null>}
 */
const detectFace = async (imageUri) => {
  try {
    console.log('Detecting face in image:', imageUri);
    
    // Read image file as base64
    const imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    
    // Call Azure Face API to detect face
    const response = await fetch(`${AZURE_ENDPOINT}/face/v1.0/detect`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Face API detect failed:', errorText);
      throw new Error(`Face detection failed: ${response.status} ${errorText}`);
    }

    const faces = await response.json();
    console.log(`Detected ${faces.length} face(s)`);
    
    if (faces.length === 0) {
      return null;
    }
    
    if (faces.length > 1) {
      console.warn('Multiple faces detected, using the first one');
    }
    
    return {
      faceId: faces[0].faceId,
      faceRectangle: faces[0].faceRectangle,
    };
  } catch (error) {
    console.error('Error detecting face:', error);
    throw error;
  }
};

/**
 * Load reference face ID for a user from their reference image
 * @param {string} username - Username to load reference for
 * @returns {Promise<boolean>} - Success status
 */
export const loadReferenceFace = async (username) => {
  try {
    if (!modelsLoaded) {
      const initialized = await initializeFaceAPI();
      if (!initialized) {
        throw new Error('Failed to initialize Azure Face API');
      }
    }

    // Check if already loaded
    if (referenceFaceIds.has(username)) {
      console.log(`Reference face already loaded for ${username}`);
      return true;
    }

    // Get reference image path
    let referenceImage;
    try {
      if (username === 'testuser') {
        referenceImage = require('../assets/faces/testuser.jpg');
      } else {
        // For future extensibility - add more users here
        throw new Error(`No reference image found for user: ${username}`);
      }
    } catch (requireError) {
      throw new Error(`Reference image not found for ${username}. Please ensure assets/faces/${username}.jpg exists.`);
    }

    // Convert asset to local URI
    const asset = Asset.fromModule(referenceImage);
    await asset.downloadAsync();
    
    if (!asset.localUri) {
      throw new Error('Failed to load reference image asset');
    }

    console.log(`Loading reference face for ${username} from:`, asset.localUri);
    
    // Detect face in reference image
    const faceData = await detectFace(asset.localUri);
    
    if (!faceData) {
      throw new Error('No face detected in reference image');
    }

    // Store the face ID for this user
    referenceFaceIds.set(username, faceData.faceId);
    console.log(`Reference face loaded successfully for ${username}`);
    return true;
  } catch (error) {
    console.error(`Error loading reference face for ${username}:`, error);
    return false;
  }
};

/**
 * Verify if the captured face matches the reference face using Azure Face API
 * @param {string} capturedImageUri - URI of the captured image
 * @param {string} username - Username to verify against
 * @returns {Promise<{success: boolean, confidence?: number, error?: string}>}
 */
export const verifyFace = async (capturedImageUri, username) => {
  try {
    console.log(`Starting face verification for ${username}...`);
    
    if (!modelsLoaded) {
      const initialized = await initializeFaceAPI();
      if (!initialized) {
        return {
          success: false,
          error: 'Failed to initialize Azure Face API'
        };
      }
    }

    // Load reference face if not already loaded
    let referenceFaceId = referenceFaceIds.get(username);
    if (!referenceFaceId) {
      console.log(`Reference face not loaded, loading for ${username}...`);
      const loaded = await loadReferenceFace(username);
      if (!loaded) {
        return {
          success: false,
          error: `No reference image available for user: ${username}`
        };
      }
      referenceFaceId = referenceFaceIds.get(username);
    }

    // Detect face in captured image
    console.log('Detecting face in captured image...');
    const capturedFaceData = await detectFace(capturedImageUri);
    
    if (!capturedFaceData) {
      return {
        success: false,
        error: 'No face detected in captured image. Please ensure your face is clearly visible.'
      };
    }

    console.log('Face detected, verifying with reference...');
    
    // Call Azure Face API Verify endpoint
    const verifyResponse = await fetch(`${AZURE_ENDPOINT}/face/v1.0/verify`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        faceId1: capturedFaceData.faceId,
        faceId2: referenceFaceId,
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Azure Face API verify failed:', errorText);
      return {
        success: false,
        error: `Face verification failed: ${verifyResponse.status}`
      };
    }

    const verifyResult = await verifyResponse.json();
    console.log('Verification result:', verifyResult);
    
    const { isIdentical, confidence } = verifyResult;
    const isMatch = isIdentical && confidence >= SIMILARITY_THRESHOLD;

    return {
      success: isMatch,
      confidence: confidence,
      error: isMatch ? null : `Face not matching. Confidence: ${(confidence * 100).toFixed(1)}% (minimum required: ${(SIMILARITY_THRESHOLD * 100).toFixed(1)}%)`
    };
  } catch (error) {
    console.error('Error during face verification:', error);
    return {
      success: false,
      error: `Face verification error: ${error.message}`
    };
  }
};

/**
 * Preload reference faces for better performance
 * Call this function when the app starts to load all reference images
 * @param {string[]} usernames - Array of usernames to preload
 */
export const preloadReferenceFaces = async (usernames) => {
  console.log('Preloading reference faces...');
  const results = [];
  
  for (const username of usernames) {
    try {
      const success = await loadReferenceFace(username);
      results.push({ username, success });
    } catch (error) {
      console.error(`Failed to preload reference for ${username}:`, error);
      results.push({ username, success: false, error: error.message });
    }
  }
  
  console.log('Reference faces preloading completed:', results);
  return results;
};

/**
 * Check if Azure Face API is initialized
 * @returns {boolean}
 */
export const areModelsLoaded = () => {
  return modelsLoaded;
};

/**
 * Get loaded usernames
 * @returns {string[]}
 */
export const getLoadedUsernames = () => {
  return Array.from(referenceFaceIds.keys());
};

/**
 * Clear all loaded reference faces (useful for memory management)
 */
export const clearReferenceFaces = () => {
  referenceFaceIds.clear();
  console.log('Reference faces cleared');
};

/**
 * Get the similarity threshold
 * @returns {number}
 */
export const getSimilarityThreshold = () => {
  return SIMILARITY_THRESHOLD;
};

