const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000;

const connectDB = async (retries = MAX_RETRIES) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'fittrack',
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected.');
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    if (retries > 0) {
      logger.info(`Retrying connection in ${RETRY_INTERVAL / 1000}s... (${retries} retries left)`);
      await new Promise((res) => {
        setTimeout(res, RETRY_INTERVAL);
      });
      return connectDB(retries - 1);
    }
    logger.error('Max retries reached. Exiting process.');
    process.exit(1);
    return null;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected gracefully.');
};

module.exports = { connectDB, disconnectDB };
