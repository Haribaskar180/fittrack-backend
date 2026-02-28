const express = require('express');
const router = express.Router();
const {
  listWorkoutSessions,
  getWorkoutSessionById,
  createWorkoutSession,
  updateWorkoutSession,
  deleteWorkoutSession,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', listWorkoutSessions);
router.get('/:id', getWorkoutSessionById);
router.post('/', createWorkoutSession);
router.put('/:id', updateWorkoutSession);
router.delete('/:id', deleteWorkoutSession);

module.exports = router;
