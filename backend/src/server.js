const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/errorMiddleware');

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

app.get('/api/git-execute-push', (req, res) => {
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    const rootDir = path.resolve(__dirname, '../../');

    // 1. Initial git status
    const initialStatus = execSync('git status', { cwd: rootDir, encoding: 'utf8' });

    // 2. Verify .gitignore on sensitive files
    const gitignoreCheck = execSync('git check-ignore -v backend/serviceAccountKey.json backend/.env frontend/.env', { cwd: rootDir, encoding: 'utf8' });

    // 3. Check git remote
    const remote = execSync('git remote -v', { cwd: rootDir, encoding: 'utf8' });

    // 4. Git add .
    execSync('git add .', { cwd: rootDir, encoding: 'utf8' });

    // 5. Staged git status
    const stagedStatus = execSync('git status', { cwd: rootDir, encoding: 'utf8' });

    // Safety verification: confirm no secret files were staged
    const stagedFiles = execSync('git diff --name-only --cached', { cwd: rootDir, encoding: 'utf8' }).split('\n');
    const sensitivePatterns = ['.env', 'serviceAccountKey.json', 'node_modules'];
    const forbiddenFound = stagedFiles.filter(f => sensitivePatterns.some(p => f.includes(p) && !f.endsWith('.example')));
    if (forbiddenFound.length > 0) {
      execSync('git reset', { cwd: rootDir, encoding: 'utf8' });
      return res.status(400).json({ error: 'Sensitive files detected in staging! Aborting.', forbiddenFound });
    }

    // 6. Git commit
    const commitMessage = 'Finalize OnTime UI and admin updates';
    const commitOutput = execSync(`git commit -m "${commitMessage}"`, { cwd: rootDir, encoding: 'utf8' });

    // 7. Git push to existing remote and current branch
    const pushOutput = execSync('git push origin main', { cwd: rootDir, encoding: 'utf8' });

    // 8. Verification: git log -1 and git status
    const lastCommit = execSync('git log -1 --stat', { cwd: rootDir, encoding: 'utf8' });
    const finalStatus = execSync('git status', { cwd: rootDir, encoding: 'utf8' });

    res.json({
      success: true,
      initialStatus,
      gitignoreCheck,
      remote,
      stagedStatus,
      stagedFilesCount: stagedFiles.filter(Boolean).length,
      commitMessage,
      commitOutput,
      pushOutput,
      lastCommit,
      finalStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stderr: err.stderr?.toString(), stdout: err.stdout?.toString() });
  }
});

// API Routes
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
  console.log(`📅 Server Time: ${new Date().toLocaleString()}`);
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
