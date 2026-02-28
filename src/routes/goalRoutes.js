const express = require('express');

const router = express.Router();
const {
  listGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', listGoals);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
