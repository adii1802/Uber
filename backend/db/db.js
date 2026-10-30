const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnecting = false;
let connectionPromise = null;
let listenersRegistered = false;

/**
 * Sanitize MongoDB URI for safe logging without exposing credentials.
 */
const sanitizeMongoUri = (uri) => {
  if (!uri) return 'undefined';
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  } catch {
    return '***';
  }
};

/**
 * Get MongoDB configuration and connection options with sensible defaults.
 */
const getMongoConfig = () => {
  const uri = process.env.DB_CONNECT || 'mongodb://127.0.0.1:27017/uber';
  const options = {
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 2,
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 10) || 45000,
    maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS, 10) || 30000,
  };
  return { uri, options };
};

/**
 * Register Mongoose connection event listeners once to avoid memory leaks.
 */
const registerConnectionEvents = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Mongoose will attempt automatic reconnection');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error: %s', err.message);
  });
};

/**
 * Connect to MongoDB with bounded exponential backoff on initial startup.
 * Returns a Promise that resolves only upon successful connection.
 */
const connectDB = async (retryCount = 0) => {
  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection attempt is in-flight, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  const { uri, options } = getMongoConfig();
  const maxRetries = parseInt(process.env.MONGO_MAX_RETRIES, 10) || 5;
  const initialDelay = parseInt(process.env.MONGO_RETRY_DELAY_MS, 10) || 1000;
  const maxDelay = 5000;

  registerConnectionEvents();

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      logger.info(
        'Connecting to MongoDB [attempt %d/%d] (%s)...',
        retryCount + 1,
        maxRetries,
        sanitizeMongoUri(uri)
      );
      await mongoose.connect(uri, options);
      isConnecting = false;
      return mongoose.connection;
    } catch (err) {
      isConnecting = false;
      connectionPromise = null;
      logger.error('MongoDB connection attempt %d failed: %s', retryCount + 1, err.message);

      if (retryCount < maxRetries - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
        logger.info('Retrying MongoDB connection in %d ms...', delay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return connectDB(retryCount + 1);
      }

      logger.error('Exhausted all %d MongoDB initial connection attempts', maxRetries);
      throw new Error(`Failed to establish initial MongoDB connection after ${maxRetries} attempts`);
    }
  })();

  return connectionPromise;
};

/**
 * Disconnect cleanly from MongoDB
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed cleanly');
  }
};

/**
 * Check MongoDB connection readiness without exposing credentials.
 */
const getDatabaseHealth = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const state = mongoose.connection.readyState;
  return {
    isConnected: state === 1,
    status: stateMap[state] || 'unknown',
    readyState: state,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseHealth,
  // Backward compatibility alias
  connectoDB: connectDB,
};
