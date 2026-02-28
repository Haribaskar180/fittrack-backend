const express = require('express');
const router = express.Router();
const {
  listNutritionLogs,
  getNutritionLogById,
  createNutritionLog,
  updateNutritionLog,
  deleteNutritionLog,
} = require('../controllers/nutritionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', listNutritionLogs);
router.get('/:id', getNutritionLogById);
router.post('/', createNutritionLog);
router.put('/:id', updateNutritionLog);
router.delete('/:id', deleteNutritionLog);

module.exports = router;
