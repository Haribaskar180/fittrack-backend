# FitTrack Backend API

Production-ready Node.js/Express REST API for the FitTrack Enterprise Fitness Tracking platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB + Mongoose |
| Authentication | JWT + Refresh Tokens |
| Password Hashing | bcryptjs (cost 12) |
| Validation | Joi + express-validator |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, Rate Limiting |
| File Uploads | Multer |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill values
cp .env.example .env

# 3. Start development server (with hot-reload)
npm run dev

# 4. Start production server
npm start
```

## Folder Structure

```
src/
├── app.js              # Express app setup
├── server.js           # Entry point, DB connection, server bootstrap
├── config/
│   └── database.js     # Mongoose connect with retry logic
├── middleware/
│   ├── auth.js         # JWT protect + role authorize
│   └── errorHandler.js # Centralised error handler
├── models/
│   ├── User.js
│   ├── Workout.js
│   ├── WorkoutPlan.js
│   ├── Exercise.js
│   ├── NutritionLog.js
│   ├── Goal.js
│   └── ProgressEntry.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── workoutController.js  (workout plans)
│   ├── sessionController.js  (logged workout sessions)
│   ├── exerciseController.js
│   ├── nutritionController.js
│   ├── goalController.js
│   ├── progressController.js
│   └── analyticsController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── workoutRoutes.js
│   ├── sessionRoutes.js
│   ├── exerciseRoutes.js
│   ├── nutritionRoutes.js
│   ├── goalRoutes.js
│   ├── progressRoutes.js
│   └── analyticsRoutes.js
└── utils/
    ├── logger.js
    ├── AppError.js
    ├── asyncHandler.js
    ├── apiResponse.js
    └── pagination.js
```

## API Endpoints

| Module | Base Path |
|--------|----------|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Exercises | `/api/v1/exercises` |
| Workout Plans | `/api/v1/workout-plans` |
| Workout Sessions | `/api/v1/workouts` |
| Nutrition | `/api/v1/nutrition` |
| Goals | `/api/v1/goals` |
| Progress | `/api/v1/progress` |
| Analytics | `/api/v1/analytics` |
| Health | `/api/v1/health` |

## Authentication

Uses JWT Bearer tokens. Include in request header:
```
Authorization: Bearer <accessToken>
```

Refresh tokens are set as HTTP-only cookies on login/register.

## Roles

- `admin` — Full access
- `coach` — Manage athletes, create plans/exercises
- `athlete` — Log own workouts, nutrition, goals, progress

## Environment Variables

See `.env.example` for all required variables.

## Response Format

All responses follow this envelope:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": {},
  "pagination": {}
}
```
