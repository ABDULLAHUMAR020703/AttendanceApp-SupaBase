/**
 * Reports API Gateway Routes
 * Forwards report generation requests to reporting-service
 */
const express = require('express');
const axios = require('axios');

const router = express.Router();

// Reporting service base URL
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:3002';

/**
 * Forward report generation request to reporting-service
 * POST /api/reports/generate
 */
router.post('/generate', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] API Gateway: Received report generation request`);
  
  try {
    // Forward user authentication headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Forward user ID and email if available
    if (req.headers['x-user-id']) {
      headers['x-user-id'] = req.headers['x-user-id'];
    }
    if (req.headers['x-user-email']) {
      headers['x-user-email'] = req.headers['x-user-email'];
    }
    
    console.log(`[${timestamp}] API Gateway: Forwarding to Reporting Service at ${REPORTING_SERVICE_URL}/api/reports/generate`);
    const response = await axios.post(`${REPORTING_SERVICE_URL}/api/reports/generate`, req.body, {
      headers,
      timeout: 30000, // 30 second timeout for report generation
    });
    
    console.log(`[${timestamp}] API Gateway: Reporting Service responded with status ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`[${timestamp}] API Gateway - Report generation forwarding error:`, error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      res.status(503).json({
        success: false,
        error: 'Reporting service unavailable',
        message: 'Unable to connect to reporting service',
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
});

/**
 * Health check
 * GET /api/reports/health
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${REPORTING_SERVICE_URL}/api/reports/health`, {
      timeout: 5000,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Reporting service unavailable',
    });
  }
});

module.exports = router;

