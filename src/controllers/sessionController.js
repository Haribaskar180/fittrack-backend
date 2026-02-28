const Workout = require('../models/Workout');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const canAccessUserData = (req, targetUserId) => {
  const requesterId = req.user._id.toString();
  const targetStr = targetUserId.toString();
  if (req.user.role === 'admin') return true;
  if (requesterId === targetStr) return true;
  if (req.user.role === 'coach' && req.user.athleteIds?.map(String).includes(targetStr)) return true;
  return false;
};

// GET /api/v1/workouts/sessions
const listWorkoutSessions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { userId, from, to } = req.query;

  const targetUserId = userId || req.user._id;

  if (!canAccessUserData(req, targetUserId)) {
    throw new AppError('Not authorised to view these workouts.', 403);
  }

  const filter = { userId: targetUserId, deletedAt: null };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [workouts, total] = await Promise.all([
    Workout.find(filter)
      .populate('exercises.exerciseId', 'name category')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }),
    Workout.countDocuments(filter),
  ]);

  return sendPaginated(res, { workouts }, buildPaginationMeta(total, page, limit), 'Workouts retrieved');
});

// GET /api/v1/workouts/sessions/:id
const getWorkoutSessionById = asyncHandler(async (req, res) => {
  const workout = await Workout.findOne({
    _id: req.params.id,
    deletedAt: null,
  }).populate('exercises.exerciseId', 'name category primaryMuscles');

  if (!workout) throw new AppError('Workout not found.', 404);

  if (!canAccessUserData(req, workout.userId)) {
    throw new AppError('Not authorised to view this workout.', 403);
  }

  return sendSuccess(res, { workout }, 'Workout retrieved');
});

// POST /api/v1/workouts/sessions
const createWorkoutSession = asyncHandler(async (req, res) => {
  const workout = await Workout.create({ ...req.body, userId: req.user._id });
  return sendSuccess(res, { workout }, 'Workout logged', 201);
});

// PUT /api/v1/workouts/sessions/:id
const updateWorkoutSession = asyncHandler(async (req, res) => {
  const workout = await Workout.findOne({ _id: req.params.id, deletedAt: null });
  if (!workout) throw new AppError('Workout not found.', 404);

  if (req.user.role !== 'admin' && workout.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to update this workout.', 403);
  }

  const { deletedAt, userId, ...updateData } = req.body; // prevent overwriting protected fields
  const updated = await Workout.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('exercises.exerciseId', 'name');

  return sendSuccess(res, { workout: updated }, 'Workout updated');
});

// DELETE /api/v1/workouts/sessions/:id  (soft delete)
const deleteWorkoutSession = asyncHandler(async (req, res) => {
  const workout = await Workout.findOne({ _id: req.params.id, deletedAt: null });
  if (!workout) throw new AppError('Workout not found.', 404);

  if (req.user.role !== 'admin' && workout.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to delete this workout.', 403);
  }

  await Workout.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
  res.status(204).send();
});

module.exports = {
  listWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
};
