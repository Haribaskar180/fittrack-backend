const ProgressEntry = require('../models/ProgressEntry');
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

// GET /api/v1/progress
const listProgressEntries = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { userId, from, to } = req.query;

  const targetUserId = userId || req.user._id;
  if (!canAccess(req, targetUserId)) throw new AppError('Not authorised.', 403);

  const filter = { userId: targetUserId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [entries, total] = await Promise.all([
    ProgressEntry.find(filter)
      .populate('performancePRs.exerciseId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 }),
    ProgressEntry.countDocuments(filter),
  ]);

  return sendPaginated(res, { entries }, buildPaginationMeta(total, page, limit), 'Progress entries retrieved');
});

// GET /api/v1/progress/:id
const getProgressEntryById = asyncHandler(async (req, res) => {
  const entry = await ProgressEntry.findById(req.params.id).populate(
    'performancePRs.exerciseId',
    'name category'
  );
  if (!entry) throw new AppError('Progress entry not found.', 404);
  if (!canAccess(req, entry.userId)) throw new AppError('Not authorised.', 403);
  return sendSuccess(res, { entry }, 'Progress entry retrieved');
});

// POST /api/v1/progress
const createProgressEntry = asyncHandler(async (req, res) => {
  const { date, bodyMetrics, performancePRs, notes, photos } = req.body;
  if (!date) throw new AppError('Date is required.', 400);

  const entry = await ProgressEntry.create({
    userId: req.user._id,
    date: new Date(date),
    bodyMetrics,
    performancePRs,
    notes,
    photos,
  });

  return sendSuccess(res, { entry }, 'Progress entry created', 201);
});

// PUT /api/v1/progress/:id
const updateProgressEntry = asyncHandler(async (req, res) => {
  const entry = await ProgressEntry.findById(req.params.id);
  if (!entry) throw new AppError('Progress entry not found.', 404);

  if (req.user.role !== 'admin' && entry.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised.', 403);
  }

  const updates = ['bodyMetrics', 'performancePRs', 'notes', 'photos'];
  for (const key of updates) {
    if (req.body[key] !== undefined) entry[key] = req.body[key];
  }

  await entry.save();
  return sendSuccess(res, { entry }, 'Progress entry updated');
});

// DELETE /api/v1/progress/:id
const deleteProgressEntry = asyncHandler(async (req, res) => {
  const entry = await ProgressEntry.findById(req.params.id);
  if (!entry) throw new AppError('Progress entry not found.', 404);

  if (req.user.role !== 'admin' && entry.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorised.', 403);
  }

  await entry.deleteOne();
  res.status(204).send();
});

module.exports = {
  listProgressEntries,
  getProgressEntryById,
  createProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
};
