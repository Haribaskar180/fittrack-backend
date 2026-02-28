const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7') * 24 * 60 * 60 * 1000,
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
      issuer: process.env.JWT_ISSUER || 'fittrack-api',
    }
  );
};

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Email, password, firstName, and lastName are required.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already in use.', 409);
  }

  const allowedRoles = ['athlete', 'coach'];
  const userRole = allowedRoles.includes(role) ? role : 'athlete';

  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash: password,
    role: userRole,
    profile: { firstName, lastName },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken },
  });

  res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt', refreshToken, COOKIE_OPTIONS);

  return sendSuccess(
    res,
    { user: user.toSafeObject(), accessToken },
    'Registration successful',
    201
  );
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    deletedAt: null,
  }).select('+passwordHash +refreshTokens');

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }
  if (!user.isActive) {
    throw new AppError('Account deactivated. Please contact support.', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();

  user.refreshTokens = [...(user.refreshTokens || []), refreshToken];
  user.lastLoginAt = new Date();
  await user.save();

  res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt', refreshToken, COOKIE_OPTIONS);

  return sendSuccess(res, { user: user.toSafeObject(), accessToken }, 'Login successful');
});

// POST /api/v1/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt'];

  if (!incomingToken) {
    throw new AppError('Refresh token missing.', 401);
  }

  const user = await User.findOne({ refreshTokens: incomingToken }).select(
    '+refreshTokens'
  );

  if (!user) {
    throw new AppError('Invalid or expired refresh token.', 401);
  }
  if (!user.isActive) {
    throw new AppError('Account deactivated.', 403);
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  user.refreshTokens = user.refreshTokens.filter((t) => t !== incomingToken);
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  const accessToken = generateAccessToken(user);

  res.cookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt', newRefreshToken, COOKIE_OPTIONS);

  return sendSuccess(res, { accessToken }, 'Token refreshed');
});

// POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt'];

  if (incomingToken && req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: incomingToken },
    });
  }

  res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt');
  return sendSuccess(res, {}, 'Logged out successfully');
});

// POST /api/v1/auth/logout-all
const logoutAll = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshTokens: [] });
  res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || 'fittrack_rt');
  return sendSuccess(res, {}, 'Logged out from all devices');
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user.toSafeObject() }, 'Current user retrieved');
});

module.exports = { register, login, refresh, logout, logoutAll, getMe };
