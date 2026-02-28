const WorkoutPlan = require('../models/WorkoutPlan');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/v1/workout-plans
const listWorkoutPlans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { isTemplate } = req.query;

  let filter = {};

  if (req.user.role === 'athlete') {
    filter.assignedTo = req.user._id;
  } else if (req.user.role === 'coach') {
    filter.createdBy = req.user._id;
  }
  // admin sees all

  if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';

  const [plans, total] = await Promise.all([
    WorkoutPlan.find(filter)
      .populate('createdBy', 'profile.firstName profile.lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    WorkoutPlan.countDocuments(filter),
  ]);

  return sendPaginated(res, { plans }, buildPaginationMeta(total, page, limit), 'Workout plans retrieved');
});

// GET /api/v1/workout-plans/:id
const getWorkoutPlanById = asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.findById(req.params.id)
    .populate('createdBy', 'profile.firstName profile.lastName')
    .populate('assignedTo', 'profile.firstName profile.lastName email')
    .populate('weeks.days.exercises.exerciseId');

  if (!plan) throw new AppError('Workout plan not found.', 404);

  const userId = req.user._id.toString();
  const isAssigned = plan.assignedTo.some((u) => u._id.toString() === userId);

  if (
    req.user.role !== 'admin' &&
    plan.createdBy._id.toString() !== userId &&
    !isAssigned
  ) {
    throw new AppError('Not authorised to view this plan.', 403);
  }

  return sendSuccess(res, { plan }, 'Workout plan retrieved');
});

// POST /api/v1/workout-plans
const createWorkoutPlan = asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.create({ ...req.body, createdBy: req.user._id });
  return sendSuccess(res, { plan }, 'Workout plan created', 201);
});

// PUT /api/v1/workout-plans/:id
const updateWorkoutPlan = asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.findById(req.params.id);
  if (!plan) throw new AppError('Workout plan not found.', 404);

  if (req.user.role !== 'admin' && plan.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to update this plan.', 403);
  }

  const updated = await WorkoutPlan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  return sendSuccess(res, { plan: updated }, 'Workout plan updated');
});

// DELETE /api/v1/workout-plans/:id
const deleteWorkoutPlan = asyncHandler(async (req, res) => {
  const plan = await WorkoutPlan.findById(req.params.id);
  if (!plan) throw new AppError('Workout plan not found.', 404);

  if (req.user.role !== 'admin' && plan.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to delete this plan.', 403);
  }

  await plan.deleteOne();
  res.status(204).send();
});

// POST /api/v1/workout-plans/:id/assign
const assignWorkoutPlan = asyncHandler(async (req, res) => {
  const { athleteIds, startDate } = req.body;
  if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
    throw new AppError('athleteIds array is required.', 400);
  }

  const plan = await WorkoutPlan.findById(req.params.id);
  if (!plan) throw new AppError('Workout plan not found.', 404);

  if (req.user.role !== 'admin' && plan.createdBy.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to assign this plan.', 403);
  }

  const uniqueIds = [...new Set([...plan.assignedTo.map(String), ...athleteIds])];
  plan.assignedTo = uniqueIds;
  if (startDate) plan.startDate = new Date(startDate);
  await plan.save();

  return sendSuccess(res, { plan }, 'Workout plan assigned to athletes');
});

module.exports = {
  listWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  assignWorkoutPlan,
};
