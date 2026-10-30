const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./db/db');
const logger = require('./utils/logger');

const port = process.env.PORT || 4000;
const server = http.createServer(app);

let isShuttingDown = false;

/**
 * Controlled Graceful Shutdown Sequence.
 * Closes HTTP server first, then disconnects MongoDB.
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn('Graceful shutdown is already in progress...');
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 10000;
  const forceExitTimer = setTimeout(() => {
    logger.error(`Graceful shutdown exceeded timeout (${shutdownTimeout}ms). Forcefully exiting.`);
    process.exit(1);
  }, shutdownTimeout);

  forceExitTimer.unref();

  try {
    // 1. Stop accepting new HTTP requests and wait for in-flight requests to complete
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        logger.info('HTTP server closed successfully. In-flight requests finished.');
        resolve();
      });
    });

    // 2. Disconnect from MongoDB
    await disconnectDB();

    logger.info('Graceful shutdown completed successfully. Clean exit.');
    process.exit(0);
  } catch (error) {
    logger.error('Error encountered during graceful shutdown: %s', error.message);
    process.exit(1);
  }
};

// Operating System Signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Process Exception Handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception detected: %s\n%s', err.message, err.stack);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error(
    'Unhandled Rejection detected: %s',
    reason instanceof Error ? reason.stack : reason
  );
  gracefulShutdown('unhandledRejection');
});

/**
 * Server Startup Lifecycle.
 * Connects to MongoDB first, confirms readiness, then starts HTTP listener.
 */
const startServer = async () => {
  try {
    logger.info('Starting CargoRide backend service...');
    await connectDB();
    server.listen(port, () => {
      logger.info(`CargoRide Backend HTTP server listening on port ${port}`);
    });
    return server;
  } catch (error) {
    logger.error('Fatal backend startup failure: %s', error.message);
    process.exit(1);
  }
};

// Automatically start server only when executed directly (not when required by tests)
if (require.main === module) {
  startServer();
}

module.exports = { server, startServer, gracefulShutdown };