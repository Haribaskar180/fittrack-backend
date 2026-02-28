# Changelog

All notable changes to FitTrack Backend will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-02-28
### Added
- Full JWT authentication with refresh token rotation
- 7 Mongoose models: User, Workout, Exercise, NutritionLog, Goal, ProgressEntry, WorkoutPlan
- REST API: Auth, Users, Workouts, Exercises, Nutrition, Goals, Progress, Analytics
- Role-based access control (Admin / Coach / Athlete)
- Security hardening: express-mongo-sanitize, hpp, xss-clean, Helmet CSP
- ESLint (airbnb-base) + Prettier + Husky pre-commit hooks
- Commitlint with Conventional Commits standard
- GitHub Actions CI (audit + lint)
- Dependabot weekly dependency updates
- PR template, Issue templates, CODEOWNERS
