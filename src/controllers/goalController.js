const Goal = require('../models/Goal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const canAccess = (req, targetUserId) => {
  const req_id = req.user._id.toString();
  const tgt = targetUserId.toString();
  if (req.user.role === 'admin') return true;
  if (req_id === tgt) return true;
  if (req.user.role === 'coach' && req.user.athleteIds?.map(String).includes(tgt)) return true;
  return false;
};

// GET /api/v1/goals
const listGoals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { userId, status, type } = req.query;

  const targetUserId = userId || req.user._id;
  if (!canAccess(req, targetUserId)) throw new AppError('Not authorised.', 403);

  const filter = { userId: targetUserId };
  if (status) filter.status = status;
  if (type) filter.type = type;

  const [goals, total] = await Promise.all([
    Goal.find(filter)
      .populate('setBy', 'profile.firstName profile.lastName role')
      .skip(skip)
      .limit(limit)
      .sort({ targetDate: 1 }),
    Goal.countDocuments(filter),
  ]);

  return sendPaginated(res, { goals }, buildPaginationMeta(total, page, limit), 'Goals retrieved');
});

// GET /api/v1/goals/:id
const getGoalById = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id).populate('setBy', 'profile.firstName profile.lastName');
  if (!goal) throw new AppError('Goal not found.', 404);
  if (!canAccess(req, goal.userId)) throw new AppError('Not authorised.', 403);
  return sendSuccess(res, { goal }, 'Goal retrieved');
});

// POST /api/v1/goals
const createGoal = asyncHandler(async (req, res) => {
  const { userId, ...goalData } = req.body;

  // Coach/admin can set goals for others; athletes can only set their own
  let targetUserId = req.user._id;
  if (userId && userId !== req.user._id.toString()) {
    if (!['admin', 'coach'].includes(req.user.role)) {
      throw new AppError('Not authorised to set goals for other users.', 403);
    }
    targetUserId = userId;
  }

  const goal = await Goal.create({
    ...goalData,
    userId: targetUserId,
    setBy: req.user._id,
  });

  return sendSuccess(res, { goal }, 'Goal created', 201);
});

// PUT /api/v1/goals/:id
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) throw new AppError('Goal not found.', 404);
  if (!canAccess(req, goal.userId)) throw new AppError('Not authorised.', 403);

  const allowedUpdates = [
    'title', 'description', 'metric', 'currentValue',
    'targetDate', 'status', 'achievedAt', 'priority',
  ];
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) goal[key] = req.body[key];
  }

  // Auto-set achievedAt when marked achieved
  if (req.body.status === 'achieved' && !goal.achievedAt) {
    goal.achievedAt = new Date();
  }

  await goal.save();
  return sendSuccess(res, { goal }, 'Goal updated');
});

// DELETE /api/v1/goals/:id
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) throw new AppError('Goal not found.', 404);

  if (req.user.role !== 'admin' && goal.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised to delete this goal.', 403);
  }

  await goal.deleteOne();
  res.status(204).send();
});

module.exports = { listGoals, getGoalById, createGoal, updateGoal, deleteGoal };
