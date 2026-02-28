const mongoose = require('mongoose');

const planExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    sets: { type: Number, min: 1 },
    reps: { type: String }, // "8-12" or "AMRAP"
    restSeconds: { type: Number, min: 0 },
    tempo: { type: String }, // e.g. "3-1-2-0"
    rpe: { type: Number, min: 1, max: 10 },
    notes: { type: String },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6 },
    sessionName: { type: String, trim: true },
    exercises: [planExerciseSchema],
  },
  { _id: false }
);

const weekSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true, min: 1 },
    days: [daySchema],
  },
  { _id: false }
);

const workoutPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
    },
    description: { type: String, maxlength: 2000 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    weeks: [weekSchema],
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    durationWeeks: {
      type: Number,
      required: [true, 'Duration in weeks is required'],
      min: 1,
    },
    isTemplate: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    tags: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

// Indexes
workoutPlanSchema.index({ createdBy: 1 });
workoutPlanSchema.index({ assignedTo: 1 });
workoutPlanSchema.index({ isTemplate: 1, isPublic: 1 });
workoutPlanSchema.index({ tags: 1 });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
