const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const profileSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    heightCm: { type: Number, min: 0 },
    preferredUnits: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'coach', 'athlete'],
      default: 'athlete',
    },
    profile: { type: profileSchema, default: () => ({}) },
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    athleteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    refreshTokens: { type: [String], select: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ coachId: 1 });
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ deletedAt: 1 });

// Pre-save: hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method: return safe user object (strip sensitive fields)
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  return obj;
};

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  const { firstName = '', lastName = '' } = this.profile || {};
  return `${firstName} ${lastName}`.trim();
});

module.exports = mongoose.model('User', userSchema);
