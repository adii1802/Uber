const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { getDatabaseHealth } = require('./db/db');
const logger = require('./utils/logger');
const userRoutes = require('./routes/user.routes');
const captainroutes = require('./routes/captain.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Security and HTTP logging middleware
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
    skip: (req) => req.url === '/health', // Keep health checks out of noisy logs
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled request error: %s', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;