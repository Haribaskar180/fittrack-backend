const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, maxlength: 2000 },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['strength', 'cardio', 'flexibility', 'balance', 'plyometric'],
    },
    primaryMuscles: [
      {
        type: String,
        enum: [
          'chest',
          'back',
          'shoulders',
          'biceps',
          'triceps',
          'quads',
          'hamstrings',
          'glutes',
          'calves',
          'core',
          'full_body',
        ],
      },
    ],
    secondaryMuscles: [
      {
        type: String,
        enum: [
          'chest',
          'back',
          'shoulders',
          'biceps',
          'triceps',
          'quads',
          'hamstrings',
          'glutes',
          'calves',
          'core',
          'full_body',
        ],
      },
    ],
    equipment: [
      {
        type: String,
        enum: [
          'barbell',
          'dumbbell',
          'kettlebell',
          'cable',
          'machine',
          'bodyweight',
          'bands',
          'other',
        ],
      },
    ],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    instructions: [{ type: String }],
    videoUrl: { type: String },
    imageUrl: { type: String },
    isCustom: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
exerciseSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Indexes
exerciseSchema.index({ category: 1 });
exerciseSchema.index({ primaryMuscles: 1 });
exerciseSchema.index({ equipment: 1 });
exerciseSchema.index({ isCustom: 1, createdBy: 1 });
exerciseSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Exercise', exerciseSchema);
