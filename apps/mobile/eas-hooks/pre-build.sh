#!/bin/bash
# EAS pre-build hook to inject Google Maps API key into strings.xml
# This script runs before the Android build process

set -e

echo "🔧 Running pre-build hook: Google Maps API key injection"

# Get the API key from EAS secret (available as environment variable)
GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-}"

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
  echo "⚠️  Warning: GOOGLE_MAPS_API_KEY not set. Using placeholder."
  GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
fi

# Path to strings.xml (relative to apps/mobile directory where this hook runs)
STRINGS_XML="android/app/src/main/res/values/strings.xml"

if [ ! -f "$STRINGS_XML" ]; then
  echo "❌ Error: $STRINGS_XML not found"
  echo "   Current directory: $(pwd)"
  echo "   Looking for: $STRINGS_XML"
  exit 1
fi

# Backup original file (optional, for safety)
cp "$STRINGS_XML" "${STRINGS_XML}.backup"

# Replace placeholder or existing API key with actual API key
# Handle both macOS and Linux sed differences
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/<string name=\"google_maps_api_key\"[^>]*>.*<\/string>/<string name=\"google_maps_api_key\" translatable=\"false\">$GOOGLE_MAPS_API_KEY<\/string>/g" "$STRINGS_XML"
else
  # Linux (EAS build servers)
  sed -i "s/<string name=\"google_maps_api_key\"[^>]*>.*<\/string>/<string name=\"google_maps_api_key\" translatable=\"false\">$GOOGLE_MAPS_API_KEY<\/string>/g" "$STRINGS_XML"
fi

echo "✅ Google Maps API key injected into $STRINGS_XML"
echo "   API key length: ${#GOOGLE_MAPS_API_KEY} characters"
