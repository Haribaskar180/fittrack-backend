const express = require('express');
const router = express.Router();
const {
  listProgressEntries,
  getProgressEntryById,
  createProgressEntry,
  updateProgressEntry,
  deleteProgressEntry,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', listProgressEntries);
router.get('/:id', getProgressEntryById);
router.post('/', createProgressEntry);
router.put('/:id', updateProgressEntry);
router.delete('/:id', deleteProgressEntry);

module.exports = router;
