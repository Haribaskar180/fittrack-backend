const Workout = require('../models/Workout');
const NutritionLog = require('../models/NutritionLog');
const Goal = require('../models/Goal');
const ProgressEntry = require('../models/ProgressEntry');
const User = require('../models/User');
const WorkoutPlan = require('../models/WorkoutPlan');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getPeriodDates = (period) => {
  const now = new Date();
  let from;
  switch (period) {
    case 'week':
      from = new Date(now);
      from.setDate(now.getDate() - 7);
      break;
    case 'month':
      from = new Date(now);
      from.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      break;
    default:
      from = new Date(now);
      from.setDate(now.getDate() - 7);
  }
  return { from, to: now };
};

const buildUserDashboard = async (userId, period) => {
  const { from, to } = getPeriodDates(period);

  const [workouts, nutritionLogs, goals, recentWorkouts] = await Promise.all([
    Workout.find({ userId, date: { $gte: from, $lte: to }, deletedAt: null }),
    NutritionLog.find({ userId, date: { $gte: from, $lte: to } }),
    Goal.find({ userId }),
    Workout.find({ userId, deletedAt: null }).sort({ date: -1 }).limit(5).select('title date durationMinutes'),
  ]);

  // Workout summary
  const totalSessions = workouts.length;
  let totalVolumeKg = 0;
  let totalDurationMin = 0;
  for (const w of workouts) {
    totalDurationMin += w.durationMinutes || 0;
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        totalVolumeKg += (s.weightKg || 0) * (s.reps || 0);
      }
    }
  }

  // Streak calculation (consecutive days with workouts)
  const workoutDates = [...new Set(workouts.map((w) => w.date.toISOString().split('T')[0]))].sort().reverse();
  let streakDays = 0;
  let checkDate = new Date();
  for (const dateStr of workoutDates) {
    const check = checkDate.toISOString().split('T')[0];
    if (dateStr === check) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  // Nutrition summary
  const loggedDays = nutritionLogs.length;
  const avgDailyCalories = loggedDays > 0 ? nutritionLogs.reduce((s, l) => s + (l.totals?.calories || 0), 0) / loggedDays : 0;
  const avgProteinG = loggedDays > 0 ? nutritionLogs.reduce((s, l) => s + (l.totals?.proteinG || 0), 0) / loggedDays : 0;
  const avgCarbsG = loggedDays > 0 ? nutritionLogs.reduce((s, l) => s + (l.totals?.carbsG || 0), 0) / loggedDays : 0;
  const avgFatG = loggedDays > 0 ? nutritionLogs.reduce((s, l) => s + (l.totals?.fatG || 0), 0) / loggedDays : 0;

  // Goals summary
  const totalActive = goals.filter((g) => g.status === 'active').length;
  const totalAchieved = goals.filter((g) => g.status === 'achieved').length;
  const completionRate = goals.length > 0 ? Math.round((totalAchieved / goals.length) * 100) : 0;

  return {
    workoutsSummary: {
      totalSessions,
      totalVolumeKg: Math.round(totalVolumeKg),
      avgDurationMin: totalSessions > 0 ? Math.round(totalDurationMin / totalSessions) : 0,
      streakDays,
      weeklyFrequency: Math.round(totalSessions / (period === 'year' ? 52 : period === 'month' ? 4 : 1)),
    },
    nutritionSummary: {
      avgDailyCalories: Math.round(avgDailyCalories),
      avgProteinG: Math.round(avgProteinG),
      avgCarbsG: Math.round(avgCarbsG),
      avgFatG: Math.round(avgFatG),
      loggedDays,
    },
    goalsSummary: { totalActive, totalAchieved, completionRate },
    recentWorkouts,
  };
};

// GET /api/v1/analytics/me/dashboard
const getMyDashboard = asyncHandler(async (req, res) => {
  const { period = 'week' } = req.query;
  const dashboard = await buildUserDashboard(req.user._id, period);
  return sendSuccess(res, dashboard, 'Dashboard data retrieved');
});

// GET /api/v1/analytics/athlete/:id
const getAthleteDashboard = asyncHandler(async (req, res) => {
  const athleteId = req.params.id;

  // Authorization
  if (req.user.role !== 'admin') {
    if (req.user.role !== 'coach' || !req.user.athleteIds?.map(String).includes(athleteId)) {
      throw new AppError('Not authorised to view this athlete\'s analytics.', 403);
    }
  }

  const athlete = await User.findOne({ _id: athleteId, deletedAt: null });
  if (!athlete) throw new AppError('Athlete not found.', 404);

  const { period = 'week' } = req.query;
  const dashboard = await buildUserDashboard(athleteId, period);
  return sendSuccess(res, dashboard, 'Athlete dashboard retrieved');
});

// GET /api/v1/analytics/coach/overview
const getCoachOverview = asyncHandler(async (req, res) => {
  const coachId = req.user._id;
  const athleteIds = req.user.athleteIds || [];

  const { from } = getPeriodDates('week');

  const athletes = await User.find({
    _id: { $in: athleteIds },
    deletedAt: null,
  }).select('profile.firstName profile.lastName email');

  const athleteData = await Promise.all(
    athletes.map(async (athlete) => {
      const [lastWorkout, weekWorkouts, activeGoals, achievedThisMonth] = await Promise.all([
        Workout.findOne({ userId: athlete._id, deletedAt: null }).sort({ date: -1 }).select('date'),
        Workout.countDocuments({ userId: athlete._id, date: { $gte: from }, deletedAt: null }),
        Goal.countDocuments({ userId: athlete._id, status: 'active' }),
        Goal.countDocuments({
          userId: athlete._id,
          status: 'achieved',
          achievedAt: { $gte: new Date(new Date().setDate(1)) },
        }),
      ]);

      return {
        userId: athlete._id,
        name: `${athlete.profile?.firstName || ''} ${athlete.profile?.lastName || ''}`.trim(),
        lastWorkoutDate: lastWorkout?.date || null,
        weeklyComplianceRate: weekWorkouts,
        activeGoals,
        goalsAchievedThisMonth: achievedThisMonth,
      };
    })
  );

  const activeThisWeek = athleteData.filter((a) => {
    if (!a.lastWorkoutDate) return false;
    return new Date(a.lastWorkoutDate) >= from;
  }).length;

  return sendSuccess(
    res,
    {
      athletes: athleteData,
      aggregates: {
        totalAthletes: athletes.length,
        activeThisWeek,
        avgComplianceRate:
          athletes.length > 0
            ? Math.round(athleteData.reduce((s, a) => s + a.weeklyComplianceRate, 0) / athletes.length)
            : 0,
      },
    },
    'Coach overview retrieved'
  );
});

// GET /api/v1/analytics/admin/platform
const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const toDate = to ? new Date(to) : new Date();

  const [totalUsers, athletes, coaches, newThisPeriod, totalWorkouts, totalNutritionLogs] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ role: 'athlete', deletedAt: null }),
    User.countDocuments({ role: 'coach', deletedAt: null }),
    User.countDocuments({ createdAt: { $gte: fromDate, $lte: toDate }, deletedAt: null }),
    Workout.countDocuments({ date: { $gte: fromDate, $lte: toDate }, deletedAt: null }),
    NutritionLog.countDocuments({ date: { $gte: fromDate, $lte: toDate } }),
  ]);

  const activeUsers = await Workout.distinct('userId', {
    date: { $gte: fromDate, $lte: toDate },
    deletedAt: null,
  });

  // Growth data: group new users and workouts by day (last 30 days max)
  const growthAgg = await User.aggregate([
    { $match: { createdAt: { $gte: fromDate, $lte: toDate }, deletedAt: null } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        newUsers: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return sendSuccess(
    res,
    {
      users: {
        total: totalUsers,
        athletes,
        coaches,
        newThisPeriod,
        activeThisPeriod: activeUsers.length,
      },
      activity: {
        totalWorkoutsLogged: totalWorkouts,
        totalNutritionLogs,
        avgWorkoutsPerUser: totalUsers > 0 ? (totalWorkouts / totalUsers).toFixed(2) : 0,
      },
      growth: growthAgg.map((g) => ({ date: g._id, newUsers: g.newUsers })),
    },
    'Platform analytics retrieved'
  );
});

// GET /api/v1/analytics/progress/chart
const getProgressChart = asyncHandler(async (req, res) => {
  const { userId, metric, from, to } = req.query;

  const targetUserId = userId || req.user._id;

  // Auth check
  const req_id = req.user._id.toString();
  const tgt = targetUserId.toString();
  const isAuthorised =
    req.user.role === 'admin' ||
    req_id === tgt ||
    (req.user.role === 'coach' && req.user.athleteIds?.map(String).includes(tgt));

  if (!isAuthorised) throw new AppError('Not authorised.', 403);

  if (!metric) throw new AppError('metric query param is required.', 400);

  const filter = { userId: targetUserId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const entries = await ProgressEntry.find(filter).sort({ date: 1 });

  const bodyMetricFields = ['weightKg', 'bodyFatPercent', 'muscleMassKg'];
  let series = [];
  let unit = '';

  if (bodyMetricFields.includes(metric)) {
    unit = metric === 'weightKg' || metric === 'muscleMassKg' ? 'kg' : '%';
    series = entries
      .filter((e) => e.bodyMetrics?.[metric] != null)
      .map((e) => ({ date: e.date.toISOString(), value: e.bodyMetrics[metric] }));
  } else {
    // PR metric: look inside performancePRs
    unit = metric.includes('kg') ? 'kg' : metric.includes('reps') ? 'reps' : metric.includes('time') ? 's' : 'm';
    for (const entry of entries) {
      for (const pr of entry.performancePRs || []) {
        if (pr.metric === metric) {
          series.push({ date: entry.date.toISOString(), value: pr.value });
        }
      }
    }
  }

  return sendSuccess(res, { metric, unit, series }, 'Progress chart data retrieved');
});

module.exports = {
  getMyDashboard,
  getAthleteDashboard,
  getCoachOverview,
  getPlatformAnalytics,
  getProgressChart,
};
