const express = require('express');
const router = express.Router();
const {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
} = require('../controllers/exerciseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', listExercises);
router.get('/:id', getExerciseById);
router.post('/', authorize('admin', 'coach'), createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', authorize('admin'), deleteExercise);

module.exports = router;
