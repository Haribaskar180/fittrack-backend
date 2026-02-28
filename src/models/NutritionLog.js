const mongoose = require('mongoose');

const macrosSchema = new mongoose.Schema(
  {
    proteinG: { type: Number, min: 0, default: 0 },
    carbsG: { type: Number, min: 0, default: 0 },
    fatG: { type: Number, min: 0, default: 0 },
    fiberG: { type: Number, min: 0, default: 0 },
    sugarG: { type: Number, min: 0, default: 0 },
    sodiumMg: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const foodItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    servingSize: { type: Number, min: 0 },
    servingUnit: {
      type: String,
      enum: ['g', 'ml', 'oz', 'cup', 'tbsp', 'piece'],
      default: 'g',
    },
    quantity: { type: Number, min: 0, default: 1 },
    calories: { type: Number, min: 0, default: 0 },
    macros: { type: macrosSchema, default: () => ({}) },
  },
  { _id: false }
);

const mealSchema = new mongoose.Schema(
  {
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'],
      required: true,
    },
    time: { type: Date },
    items: [foodItemSchema],
  },
  { _id: false }
);

const totalsSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0 },
    proteinG: { type: Number, default: 0 },
    carbsG: { type: Number, default: 0 },
    fatG: { type: Number, default: 0 },
    fiberG: { type: Number, default: 0 },
    waterMl: { type: Number, default: 0 },
  },
  { _id: false }
);

const nutritionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    date: { type: Date, required: [true, 'Date is required'] },
    meals: [mealSchema],
    totals: { type: totalsSchema, default: () => ({}) },
    waterMl: { type: Number, min: 0, default: 0 },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// Auto-compute daily totals before save
nutritionLogSchema.pre('save', function (next) {
  const totals = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    waterMl: this.waterMl || 0,
  };
  this.meals.forEach((meal) => {
    meal.items.forEach((item) => {
      const qty = item.quantity || 1;
      totals.calories += (item.calories || 0) * qty;
      if (item.macros) {
        totals.proteinG += (item.macros.proteinG || 0) * qty;
        totals.carbsG += (item.macros.carbsG || 0) * qty;
        totals.fatG += (item.macros.fatG || 0) * qty;
        totals.fiberG += (item.macros.fiberG || 0) * qty;
      }
    });
  });
  this.totals = totals;
  next();
});

// Indexes
nutritionLogSchema.index({ userId: 1, date: -1 });
nutritionLogSchema.index({ userId: 1, 'totals.calories': 1 });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
