const Exercise = require('../models/Exercise');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/v1/exercises
const listExercises = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { category, muscle, equipment, search, difficulty } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (muscle) filter.primaryMuscles = muscle;
  if (equipment) filter.equipment = equipment;
  if (difficulty) filter.difficulty = difficulty;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [exercises, total] = await Promise.all([
    Exercise.find(filter)
      .populate('createdBy', 'profile.firstName profile.lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 }),
    Exercise.countDocuments(filter),
  ]);

  return sendPaginated(
    res,
    { exercises },
    buildPaginationMeta(total, page, limit),
    'Exercises retrieved'
  );
});

// GET /api/v1/exercises/:id
const getExerciseById = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id).populate(
    'createdBy',
    'profile.firstName profile.lastName'
  );
  if (!exercise) throw new AppError('Exercise not found.', 404);
  return sendSuccess(res, { exercise }, 'Exercise retrieved');
});

// POST /api/v1/exercises
const createExercise = asyncHandler(async (req, res) => {
  const exerciseData = { ...req.body, createdBy: req.user._id };
  const exercise = await Exercise.create(exerciseData);
  return sendSuccess(res, { exercise }, 'Exercise created', 201);
});

// PUT /api/v1/exercises/:id
const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) throw new AppError('Exercise not found.', 404);

  // Only admin can update global exercises; coach can update their custom ones
  if (
    req.user.role !== 'admin' &&
    !(
      req.user.role === 'coach' &&
      exercise.isCustom &&
      exercise.createdBy.toString() === req.user._id.toString()
    )
  ) {
    throw new AppError('Not authorised to update this exercise.', 403);
  }

  const updated = await Exercise.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return sendSuccess(res, { exercise: updated }, 'Exercise updated');
});

// DELETE /api/v1/exercises/:id
const deleteExercise = asyncHandler(async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) throw new AppError('Exercise not found.', 404);

  await exercise.deleteOne();
  res.status(204).send();
});

module.exports = {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
};
