const mongoose = require('mongoose');

const measurementsSchema = new mongoose.Schema(
  {
    chestCm: { type: Number, min: 0 },
    waistCm: { type: Number, min: 0 },
    hipsCm: { type: Number, min: 0 },
    leftArmCm: { type: Number, min: 0 },
    rightArmCm: { type: Number, min: 0 },
    leftThighCm: { type: Number, min: 0 },
    rightThighCm: { type: Number, min: 0 },
    neckCm: { type: Number, min: 0 },
  },
  { _id: false }
);

const bodyMetricsSchema = new mongoose.Schema(
  {
    weightKg: { type: Number, min: 0 },
    bodyFatPercent: { type: Number, min: 0, max: 100 },
    muscleMassKg: { type: Number, min: 0 },
    measurements: { type: measurementsSchema, default: () => ({}) },
  },
  { _id: false }
);

const performancePRSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    metric: {
      type: String,
      enum: ['1rm_kg', 'max_reps', 'best_time_s', 'best_distance_m'],
      required: true,
    },
    value: { type: Number, required: true },
    achievedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    angle: {
      type: String,
      enum: ['front', 'back', 'left', 'right'],
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const progressEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    date: { type: Date, required: [true, 'Date is required'] },
    bodyMetrics: { type: bodyMetricsSchema, default: () => ({}) },
    performancePRs: [performancePRSchema],
    photos: [photoSchema],
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// Indexes
progressEntrySchema.index({ userId: 1, date: -1 });
progressEntrySchema.index({ userId: 1, 'bodyMetrics.weightKg': 1 });
progressEntrySchema.index({ 'performancePRs.exerciseId': 1 });

module.exports = mongoose.model('ProgressEntry', progressEntrySchema);
