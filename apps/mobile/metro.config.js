const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver for font files
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

// Add source extensions for better module resolution
config.resolver.sourceExts.push('mjs', 'cjs');

// Enable package exports for modern packages
// This handles subpath exports automatically
config.resolver.unstable_enablePackageExports = true;

// Configure resolver to handle browser-only packages in React Native
const defaultResolver = config.resolver.resolveRequest;
if (defaultResolver) {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle idb package - provide empty shim for React Native (IndexedDB not available)
    if (moduleName === 'idb' && platform !== 'web') {
      try {
        const path = require('path');
        return {
          filePath: path.resolve(__dirname, 'metro-idb-shim.js'),
          type: 'sourceFile',
        };
      } catch (e) {
        // Fall through to default
      }
    }
    
    // Use default resolver for everything else
    return defaultResolver(context, moduleName, platform);
  };
}

module.exports = config;
