const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Centralised error handler middleware.
 * Handles Mongoose errors, JWT errors, and custom AppErrors.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log
  if (error.statusCode >= 500) {
    logger.error('Server Error:', { message: err.message, stack: err.stack, url: req.originalUrl });
  } else {
    logger.warn('Client Error:', { message: err.message, url: req.originalUrl });
  }

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    error.message = `Resource not found with id: ${err.value}`;
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error.message = `Duplicate value for ${field}. Please use a different value.`;
    error.statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error.message = messages.join('. ');
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token. Please log in again.';
    error.statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired. Please log in again.';
    error.statusCode = 401;
  }

  const response = {
    success: false,
    message: error.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV === 'development') {
    response.error = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
