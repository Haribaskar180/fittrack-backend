const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
  {
    field: { type: String },
    targetValue: { type: Number },
    unit: { type: String },
    direction: { type: String, enum: ['increase', 'decrease', 'maintain'] },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['weight', 'body_fat', 'strength', 'endurance', 'nutrition', 'custom'],
      required: [true, 'Goal type is required'],
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    description: { type: String, maxlength: 1000 },
    metric: { type: metricSchema, default: () => ({}) },
    startValue: { type: Number },
    currentValue: { type: Number },
    startDate: { type: Date },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'achieved', 'missed', 'cancelled'],
      default: 'active',
    },
    achievedAt: { type: Date },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

// Indexes
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });
goalSchema.index({ setBy: 1 });

module.exports = mongoose.model('Goal', goalSchema);
