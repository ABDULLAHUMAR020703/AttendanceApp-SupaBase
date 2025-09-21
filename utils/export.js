import * as FileSystem from 'expo-file-system/legacy';
import { getAttendanceRecords } from './storage';

/**
 * Export attendance records to CSV format
 * @returns {Promise<{success: boolean, fileUri?: string, error?: string}>}
 */
export const exportAttendanceToCSV = async () => {
  try {
    const records = await getAttendanceRecords();
    
    if (records.length === 0) {
      return {
        success: false,
        error: 'No attendance records found to export'
      };
    }
    
    // Create CSV header
    let csvContent = 'Username,Date,Time,Type,Latitude,Longitude,Photo\n';
    
    // Add records to CSV
    records.forEach(record => {
      const date = new Date(record.timestamp).toLocaleDateString();
      const time = new Date(record.timestamp).toLocaleTimeString();
      const lat = record.location ? record.location.latitude : '';
      const lng = record.location ? record.location.longitude : '';
      const photo = record.photo ? 'Yes' : 'No';
      
      csvContent += `${record.username},${date},${time},${record.type},${lat},${lng},${photo}\n`;
    });
    
    // Create file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `attendance_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    // Write CSV file
    await FileSystem.writeAsStringAsync(fileUri, csvContent);
    
    return {
      success: true,
      fileUri: fileUri,
      fileName: fileName
    };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Share CSV file using Expo sharing
 * @param {string} fileUri - URI of the CSV file
 * @param {string} fileName - Name of the file
 */
export const shareCSVFile = async (fileUri, fileName) => {
  try {
    // Note: expo-sharing is not included in the dependencies
    // This is a placeholder for the sharing functionality
    // In a real app, you would import and use expo-sharing
    console.log('File ready for sharing:', fileUri);
    return { success: true, fileUri, fileName };
  } catch (error) {
    console.error('Error sharing file:', error);
    return { success: false, error: error.message };
  }
};
