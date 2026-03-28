# WellVantage - PT Gym Management App

## Project Overview
Mobile-first app for personal trainers to manage workouts, clients, availability, and sessions.

- **Frontend**: React Native CLI 0.76 (TypeScript)
- **Backend**: NestJS (TypeScript) + Prisma + PostgreSQL
- **Auth**: Google OAuth via `@react-native-google-signin` + JWT
- **State**: Zustand (mobile), Prisma ORM (backend)

## Project Structure

```
wellvantage/
├── backend/                  # NestJS REST API
│   ├── prisma/schema.prisma  # Database schema (source of truth)
│   ├── src/
│   │   ├── auth/             # Google OAuth + JWT auth
│   │   ├── common/           # Shared guards, decorators, filters, DTOs
│   │   ├── config/           # Env validation schema
│   │   ├── prisma/           # PrismaService (global)
│   │   └── main.ts           # Bootstrap with helmet, CORS, throttle, validation
│   └── package.json
├── mobile/                   # React Native CLI app
│   ├── ios/                  # Native iOS project
│   ├── android/              # Native Android project
│   ├── src/
│   │   ├── components/       # ErrorBoundary + ui/ (Button, Input, Header, TabBar, Card)
│   │   ├── navigation/       # React Navigation stack navigators
│   │   ├── screens/          # Screen components
│   │   ├── services/         # API client (axios + keychain)
│   │   ├── stores/           # Zustand stores
│   │   ├── theme/            # Design tokens, typography
│   │   ├── types/            # Shared TypeScript interfaces
│   │   └── App.tsx           # Root with ErrorBoundary
│   └── package.json
├── scripts/dev.sh            # Dev runner (DB + backend + Metro + device deploy)
├── docker-compose.yml        # PostgreSQL + pgAdmin
└── .env                      # Environment variables (NEVER commit)
```

## Commands

```bash
# Dev (all services)
./scripts/dev.sh              # DB + backend + Metro
./scripts/dev.sh device       # + deploy to iPhoneAjay
./scripts/dev.sh stop         # Kill all
./scripts/dev.sh status       # Check services

# Backend
cd backend && npm run start:dev
cd backend && npx prisma db push        # Sync schema to DB
cd backend && npx prisma studio         # DB GUI

# Mobile
cd mobile && npx react-native start     # Metro bundler
cd mobile && npx react-native run-ios   # Build + run iOS

# Lint & Format
cd backend && npm run lint && npm run format
cd mobile && npm run lint && npm run format
```

## Development Standards

### Backend (NestJS)

#### Security
- NEVER hardcode secrets — use `.env` + `ConfigModule` with Joi validation
- Use `config.getOrThrow()` for required env vars (fail-fast on missing config)
- `helmet` is enabled globally for security headers
- `@nestjs/throttler` is enabled globally (30 req/min default)
- CORS uses explicit origin allowlist — NEVER use `origin: true`
- JWT tokens should be short-lived (15-30 min) with refresh token rotation
- Google ID tokens verified via `google-auth-library` (local crypto, not HTTP call)
- Use `upsert` instead of find-then-create to avoid race conditions
- Each module directory must have its own `.gitignore` excluding `.env`

#### Architecture
- One module per domain (auth, workouts, clients, availability, sessions)
- Each module: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `interfaces/`
- Barrel exports (`index.ts`) in every module for clean imports
- Global `PrismaModule` — no need to import per-module
- Global `AllExceptionsFilter` handles Prisma errors (P2002 → 409, P2025 → 404)
- `@Roles()` decorator + `RolesGuard` for authorization (always pair with `AuthGuard('jwt')`)
- DTOs use `class-validator` decorators — `ValidationPipe` strips unknown fields

#### Database
- Prisma schema is the single source of truth for DB structure
- Index all foreign keys (done automatically by convention)
- Add `@@index([status])` on any model with status-based queries
- Add composite indexes for common query patterns (e.g., `[trainerId, date, status]`)
- Use `@db.Date` for date-only columns, `String` for time fields (HH:MM format)
- Cascade deletes on parent relations, `SetNull` on optional references

### Frontend (React Native)

#### Security
- Tokens stored in OS Keychain via `react-native-keychain` — NEVER use AsyncStorage for secrets
- OAuth client IDs should come from env config, not hardcoded in source
- API base URL configured per environment (`__DEV__` flag)
- 401 interceptor clears token and resets auth state

#### Architecture
- Screens in `src/screens/`, navigation in `src/navigation/`
- Shared types in `src/types/index.ts` — never duplicate type definitions
- Zustand for state management — one store per domain
- Axios instance in `src/services/api.ts` with typed helpers (`get<T>`, `post<T>`)
- `ErrorBoundary` wraps the entire app — catches render errors gracefully
- All colors, spacing, typography from `src/theme/` — never hardcode values

#### Components
- `StyleSheet.create` for all styles — no inline style objects
- `React.memo` on all reusable UI components with `displayName`
- `useCallback` for event handlers passed as props
- `Pressable` over `TouchableOpacity` for customizable press feedback
- Haptic feedback on interactive elements via `react-native-haptic-feedback`
- Theme tokens for all visual properties (colors, spacing, borderRadius, shadows)

#### Navigation
- Typed `ParamList` for every navigator
- Conditional rendering in `RootNavigator` (auth vs app stack)
- `useNavigation()` with typed hooks — never untyped `.navigate()`

### Shared Standards

#### Code Quality
- TypeScript strict mode in both projects
- ESLint + Prettier enforced (shared config: single quotes, trailing commas, 90 char width)
- `consistent-type-imports` enforced (`import type` for type-only imports)
- No `any` types — use proper interfaces (warn level, fix when touching the code)
- Barrel exports (`index.ts`) for every module/directory

#### Error Handling
- Backend: Global exception filter catches all errors → structured JSON responses
- Mobile: ErrorBoundary at root, try/catch in async operations, user-facing alerts
- Never swallow errors silently — at minimum `console.error` in catch blocks
- Nested try/catch when cleanup operations (e.g., `clearToken()`) might also fail

#### Git & CI
- `.env` in `.gitignore` at root AND backend level
- `.env.example` with placeholder values committed for reference
- Run `npm run lint` before committing
- Run `npx prisma db push` after schema changes

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 chars, cryptographically random |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Web Client Secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth callback URL |
| `APP_PORT` | No | Backend port (default: 3000) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `THROTTLE_TTL` | No | Rate limit window in seconds (default: 60) |
| `THROTTLE_LIMIT` | No | Max requests per window (default: 30) |
