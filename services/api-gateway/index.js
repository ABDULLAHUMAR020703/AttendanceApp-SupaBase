const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'API Gateway Service',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/health',
    },
  });
});

// Start server - listen on all interfaces (0.0.0.0) to allow connections from devices
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API Gateway server running on http://${HOST}:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`For physical devices, use: http://<your-computer-ip>:${PORT}`);
});

module.exports = app;

