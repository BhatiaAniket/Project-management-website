const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { apiLimiter } = require('./middleware/rateLimiter');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./services/cron.service');

// Load env vars
dotenv.config();

// Environment variable verification
console.log("=== ENV CHECK ===");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "MISSING");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Loaded" : "MISSING");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST ? "Loaded" : "MISSING");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Loaded" : "MISSING");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Loaded" : "MISSING");
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Loaded" : "MISSING");
console.log("REDIS_URL:", process.env.REDIS_URL ? "Loaded" : "MISSING");
console.log("=================");

// Connect to MongoDB & Redis
connectDB();
connectRedis();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // In dev, allow all; tighten in production
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// ━━━ Routes ━━━
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const companyOverviewRoutes = require('./routes/companyOverview');
const managerRoutes = require('./routes/managerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const projectRoutes = require('./routes/projects');
const performanceRoutes = require('./routes/performance');
const meetingRoutes = require('./routes/meetings');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const filesRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/company/overview', companyOverviewRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/people', require('./routes/people'));
app.use('/api/projects', projectRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/manager', managerRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CognifyPM API is running',
    data: { timestamp: new Date().toISOString() },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    errors: [],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [],
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  CognifyPM API Server`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}`);

  // Initialize cron jobs
  initCronJobs();

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = app;
