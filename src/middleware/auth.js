const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies JWT access token and attaches req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authenticated. Please log in.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Access token expired. Please refresh.', 401);
    }
    throw new AppError('Invalid token. Please log in again.', 401);
  }

  const user = await User.findById(decoded.sub).select('-passwordHash -refreshTokens');
  if (!user) {
    throw new AppError('User no longer exists.', 401);
  }
  if (!user.isActive) {
    throw new AppError('Account deactivated. Contact support.', 403);
  }
  if (user.deletedAt) {
    throw new AppError('Account has been deleted.', 403);
  }

  req.user = user;
  next();
});

/**
 * Role-based access control factory.
 * Usage: authorize('admin') or authorize('admin', 'coach')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Role '${req.user.role}' is not authorised to perform this action.`, 403)
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
