const express = require('express');
const router = express.Router();
const {
  listUsers,
  getUserById,
  updateUser,
  updateUserRole,
  assignCoach,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin'), listUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.put('/:id/role', authorize('admin'), updateUserRole);
router.put('/:id/assign-coach', authorize('admin'), assignCoach);
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
