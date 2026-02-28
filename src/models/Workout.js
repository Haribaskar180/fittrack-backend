const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    setNumber: { type: Number },
    reps: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    distanceMeters: { type: Number, min: 0 },
    isWarmup: { type: Boolean, default: false },
    isDropSet: { type: Boolean, default: false },
    rpe: { type: Number, min: 1, max: 10 },
    notes: { type: String },
  },
  { _id: false }
);

const workoutExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    orderIndex: { type: Number, default: 0 },
    sets: [setSchema],
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    planWeek: { type: Number },
    planDay: { type: Number },
    title: { type: String, trim: true },
    date: { type: Date, required: [true, 'Workout date is required'] },
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMinutes: { type: Number, min: 0 },
    exercises: [workoutExerciseSchema],
    notes: { type: String, maxlength: 2000 },
    mood: { type: Number, min: 1, max: 5 },
    energyLevel: { type: Number, min: 1, max: 5 },
    location: {
      type: String,
      enum: ['gym', 'home', 'outdoor', 'other'],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-compute durationMinutes
workoutSchema.pre('save', function (next) {
  if (this.startedAt && this.completedAt) {
    this.durationMinutes = Math.round((this.completedAt - this.startedAt) / 60000);
  }
  next();
});

// Indexes
workoutSchema.index({ userId: 1, date: -1 });
workoutSchema.index({ planId: 1 });
workoutSchema.index({ userId: 1, deletedAt: 1 });
workoutSchema.index({ date: -1 });

module.exports = mongoose.model('Workout', workoutSchema);
