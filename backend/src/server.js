const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorMiddleware');
const { format12HourTime, getIndiaTodayStr } = require('./utils/indiaTime');

// Route imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const scanRoutes = require('./routes/scanRoutes');
const lateRecordRoutes = require('./routes/lateRecordRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // Allow all in dev, can be locked down via config.frontendUrl
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in dev
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const { getConnectionStatus } = require('./db/firestore');
  res.json({
    status: 'ONLINE',
    service: 'OnTime - College Late-Arrival & Fine Management System',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    firestore: getConnectionStatus()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/late-records', lateRecordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Centralized error handling
app.use(errorHandler);

// Start Server
const server = app.listen(config.port, () => {
  console.log('====================================================');
  console.log(`🚀 OnTime Backend running on port ${config.port}`);
  console.log(`🌐 Health check: http://localhost:${config.port}/api/health`);
  console.log(`📅 Server Time (IST): ${getIndiaTodayStr()} ${format12HourTime(new Date())}`);
  console.log('====================================================');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
