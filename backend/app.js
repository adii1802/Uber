const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { getDatabaseHealth } = require('./db/db');
const logger = require('./utils/logger');
const { csrfProtection, generateCsrfToken, getCsrfCookieOptions } = require('./middlewares/csrf.middleware');
const userRoutes = require('./routes/user.routes');
const captainroutes = require('./routes/captain.routes');
const adminRoutes = require('./routes/admin.routes');
const vehicleRoutes = require('./routes/vehicle.routes');

const app = express();

// Allowed Origins for Credentialed CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000'];

// Security and HTTP logging middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const corsErr = new Error(`Blocked by CORS: Origin ${origin} is not allowed`);
      corsErr.status = 403;
      return callback(corsErr);
    },
    credentials: true,
  })
);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
    skip: (req) => req.url === '/health' || req.url === '/csrf-token', // Keep health & csrf out of noisy logs
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF Protection Middleware
app.use(csrfProtection);

// CSRF Token Retrieval Endpoint
app.get('/csrf-token', (req, res) => {
  let token = req.cookies ? req.cookies['XSRF-TOKEN'] : null;
  if (!token) {
    token = generateCsrfToken();
    res.cookie('XSRF-TOKEN', token, getCsrfCookieOptions());
  }
  res.status(200).json({ csrfToken: token });
});

// Safe Health Check Endpoint
app.get('/health', (req, res) => {
  const dbHealth = getDatabaseHealth();
  const statusCode = dbHealth.isConnected ? 200 : 503;

  res.status(statusCode).json({
    status: dbHealth.isConnected ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
  });
});

// Backward compatibility root endpoint
app.get('/', (req, res) => {
  res.send('hellow world');
});

// Domain Routes
app.use('/users', userRoutes);
app.use('/captains', captainroutes);
app.use('/admin', adminRoutes);
app.use('/vehicles', vehicleRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('Blocked by CORS')) {
    return res.status(403).json({ message: 'Forbidden: Untrusted request origin' });
  }
  logger.error('Unhandled request error: %s', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;