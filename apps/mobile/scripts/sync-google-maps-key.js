#!/usr/bin/env node
/**
 * Sync Google Maps API key from app.json to strings.xml
 * This script helps keep the API key consistent for local development builds
 * 
 * Usage: node scripts/sync-google-maps-key.js
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '../app.json');
const STRINGS_XML_PATH = path.join(__dirname, '../android/app/src/main/res/values/strings.xml');

try {
  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  const apiKey = appJson?.expo?.android?.config?.googleMaps?.apiKey;

  if (!apiKey) {
    console.error('❌ Error: Google Maps API key not found in app.json');
    console.error('   Expected path: expo.android.config.googleMaps.apiKey');
    process.exit(1);
  }

  if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || apiKey.includes('YOUR_')) {
    console.warn('⚠️  Warning: Placeholder API key detected in app.json');
    console.warn('   Please set a valid Google Maps API key in app.json');
  }

  // Read strings.xml
  let stringsXml = fs.readFileSync(STRINGS_XML_PATH, 'utf8');

  // Replace the API key in strings.xml
  const updatedStringsXml = stringsXml.replace(
    /<string name="google_maps_api_key"[^>]*>.*?<\/string>/,
    `<string name="google_maps_api_key" translatable="false">${apiKey}</string>`
  );

  // Write back
  fs.writeFileSync(STRINGS_XML_PATH, updatedStringsXml, 'utf8');

  console.log('✅ Google Maps API key synced from app.json to strings.xml');
  console.log(`   API key length: ${apiKey.length} characters`);
  console.log(`   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
} catch (error) {
  console.error('❌ Error syncing Google Maps API key:', error.message);
  process.exit(1);
}
