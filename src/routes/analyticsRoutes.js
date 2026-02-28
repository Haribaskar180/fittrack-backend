const express = require('express');

const router = express.Router();
const {
  getMyDashboard,
  getAthleteDashboard,
  getCoachOverview,
  getPlatformAnalytics,
  getProgressChart,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/me/dashboard', getMyDashboard);
router.get('/athlete/:id', getAthleteDashboard);
router.get('/coach/overview', authorize('admin', 'coach'), getCoachOverview);
router.get('/admin/platform', authorize('admin'), getPlatformAnalytics);
router.get('/progress/chart', getProgressChart);

module.exports = router;
