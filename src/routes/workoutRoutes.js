const express = require('express');

const router = express.Router();
const {
  listWorkoutPlans,
  getWorkoutPlanById,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  assignWorkoutPlan,
} = require('../controllers/workoutController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', listWorkoutPlans);
router.get('/:id', getWorkoutPlanById);
router.post('/', authorize('admin', 'coach'), createWorkoutPlan);
router.put('/:id', authorize('admin', 'coach'), updateWorkoutPlan);
router.delete('/:id', authorize('admin', 'coach'), deleteWorkoutPlan);
router.post('/:id/assign', authorize('admin', 'coach'), assignWorkoutPlan);

module.exports = router;
