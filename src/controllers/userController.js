const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// GET /api/v1/users  (admin only)
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { role, search, isActive } = req.query;

  const filter = { deletedAt: null };
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { 'profile.firstName': { $regex: search, $options: 'i' } },
      { 'profile.lastName': { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -refreshTokens')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return sendPaginated(res, { users }, buildPaginationMeta(total, page, limit), 'Users retrieved');
});

// GET /api/v1/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    deletedAt: null,
  }).select('-passwordHash -refreshTokens');

  if (!user) throw new AppError('User not found.', 404);

  // Access control: own profile, coach of athlete, or admin
  const requesterId = req.user._id.toString();
  const targetId = user._id.toString();
  if (
    req.user.role !== 'admin' &&
    requesterId !== targetId &&
    !(req.user.role === 'coach' && req.user.athleteIds?.map(String).includes(targetId))
  ) {
    throw new AppError('Not authorised to view this profile.', 403);
  }

  return sendSuccess(res, { user }, 'User retrieved');
});

// PUT /api/v1/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const requesterId = req.user._id.toString();
  const targetId = req.params.id;

  if (req.user.role !== 'admin' && requesterId !== targetId) {
    throw new AppError('Not authorised to update this profile.', 403);
  }

  const allowedFields = ['profile'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findOneAndUpdate(
    { _id: targetId, deletedAt: null },
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-passwordHash -refreshTokens');

  if (!user) throw new AppError('User not found.', 404);

  return sendSuccess(res, { user }, 'User updated');
});

// PUT /api/v1/users/:id/role  (admin only)
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'coach', 'athlete'].includes(role)) {
    throw new AppError('Invalid role. Must be admin, coach, or athlete.', 400);
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { role },
    { new: true }
  ).select('-passwordHash -refreshTokens');

  if (!user) throw new AppError('User not found.', 404);

  return sendSuccess(res, { user }, 'User role updated');
});

// PUT /api/v1/users/:id/assign-coach  (admin only)
const assignCoach = asyncHandler(async (req, res) => {
  const { coachId } = req.body;
  const athlete = await User.findOne({ _id: req.params.id, role: 'athlete', deletedAt: null });
  if (!athlete) throw new AppError('Athlete not found.', 404);

  if (coachId) {
    const coach = await User.findOne({ _id: coachId, role: 'coach', deletedAt: null });
    if (!coach) throw new AppError('Coach not found.', 404);

    // Remove athlete from old coach
    if (athlete.coachId) {
      await User.findByIdAndUpdate(athlete.coachId, {
        $pull: { athleteIds: athlete._id },
      });
    }

    // Assign to new coach
    await User.findByIdAndUpdate(coachId, {
      $addToSet: { athleteIds: athlete._id },
    });
    athlete.coachId = coachId;
  } else {
    // Remove coach assignment
    if (athlete.coachId) {
      await User.findByIdAndUpdate(athlete.coachId, {
        $pull: { athleteIds: athlete._id },
      });
    }
    athlete.coachId = null;
  }

  await athlete.save();
  return sendSuccess(res, { user: athlete.toSafeObject() }, 'Coach assigned');
});

// DELETE /api/v1/users/:id  (admin only — soft delete)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { deletedAt: new Date(), isActive: false },
    { new: true }
  );

  if (!user) throw new AppError('User not found.', 404);

  res.status(204).send();
});

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  updateUserRole,
  assignCoach,
  deleteUser,
};
