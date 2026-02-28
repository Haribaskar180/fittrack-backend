const NutritionLog = require('../models/NutritionLog');
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

// GET /api/v1/nutrition
const listNutritionLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { userId, date, from, to } = req.query;

  const targetUserId = userId || req.user._id;
  if (!canAccess(req, targetUserId)) throw new AppError('Not authorised.', 403);

  const filter = { userId: targetUserId };

  if (date) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: d, $lt: nextDay };
  } else if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    NutritionLog.find(filter).skip(skip).limit(limit).sort({ date: -1 }),
    NutritionLog.countDocuments(filter),
  ]);

  return sendPaginated(res, { logs }, buildPaginationMeta(total, page, limit), 'Nutrition logs retrieved');
});

// GET /api/v1/nutrition/:id
const getNutritionLogById = asyncHandler(async (req, res) => {
  const log = await NutritionLog.findById(req.params.id);
  if (!log) throw new AppError('Nutrition log not found.', 404);
  if (!canAccess(req, log.userId)) throw new AppError('Not authorised.', 403);
  return sendSuccess(res, { log }, 'Nutrition log retrieved');
});

// POST /api/v1/nutrition
const createNutritionLog = asyncHandler(async (req, res) => {
  const { date, meals, waterMl, notes } = req.body;
  if (!date) throw new AppError('Date is required.', 400);

  const userId = req.user._id;
  const logDate = new Date(date);
  const nextDay = new Date(logDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const existing = await NutritionLog.findOne({
    userId,
    date: { $gte: logDate, $lt: nextDay },
  });
  if (existing) {
    throw new AppError('Nutrition log for this date already exists. Use PUT to update.', 409);
  }

  const log = await NutritionLog.create({ userId, date: logDate, meals: meals || [], waterMl, notes });
  return sendSuccess(res, { log }, 'Nutrition log created', 201);
});

// PUT /api/v1/nutrition/:id
const updateNutritionLog = asyncHandler(async (req, res) => {
  const log = await NutritionLog.findById(req.params.id);
  if (!log) throw new AppError('Nutrition log not found.', 404);
  if (!canAccess(req, log.userId)) throw new AppError('Not authorised.', 403);

  const { meals, waterMl, notes } = req.body;
  if (meals !== undefined) log.meals = meals;
  if (waterMl !== undefined) log.waterMl = waterMl;
  if (notes !== undefined) log.notes = notes;

  await log.save(); // triggers pre-save totals computation
  return sendSuccess(res, { log }, 'Nutrition log updated');
});

// DELETE /api/v1/nutrition/:id
const deleteNutritionLog = asyncHandler(async (req, res) => {
  const log = await NutritionLog.findById(req.params.id);
  if (!log) throw new AppError('Nutrition log not found.', 404);
  if (!canAccess(req, log.userId)) throw new AppError('Not authorised.', 403);

  await log.deleteOne();
  res.status(204).send();
});

module.exports = {
  listNutritionLogs,
  getNutritionLogById,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
};
