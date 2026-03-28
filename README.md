# WellVantage

Personal Trainer Gym Management App — manage workouts, clients, availability, and sessions from your phone.

Built with **React Native** (iOS/Android) + **NestJS** (REST API) + **PostgreSQL**.

## Features

- **Google Sign-In** — one-tap authentication
- **Workout Plans** — create multi-day plans with exercises (sets, reps, duration)
- **Client Management** — assign workouts, track sessions, contact via WhatsApp/phone
- **Availability Scheduling** — set daily/weekly recurring slots with calendar picker
- **Slot Booking** — book clients into available time slots
- **Role-Based Access** — Owner sees everything, Trainer sees own data, Client sees assigned data
- **Optimized Queries** — monthly data fetching, 1-row repeat rules expanded on read

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native CLI 0.76, TypeScript, Zustand, React Navigation |
| Backend | NestJS, Prisma ORM, Passport (JWT + Google OAuth) |
| Database | PostgreSQL 16 (Docker) |
| Security | Helmet, Throttler, Joi env validation, role guards |

## Prerequisites

- **Node.js** >= 18
- **Docker** (for PostgreSQL)
- **Xcode** (for iOS) or **Android Studio** (for Android)
- **CocoaPods** (`gem install cocoapods` or via Bundler)
- **cmake** (`brew install cmake`)
- **Google Cloud Console** project with OAuth credentials

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/easywebdev4u/wellvantage.git
cd wellvantage

# Backend
cd backend && npm install && cd ..

# Mobile
cd mobile && npm install && cd ..
```

### 2. Environment setup

```bash
# Copy example env and fill in your values
cp .env.example .env

# Required values:
# DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/wellvantage?schema=public
# JWT_SECRET=<random 32+ char string>
# GOOGLE_CLIENT_ID=<your web client id>
# GOOGLE_CLIENT_SECRET=<your web client secret>
# GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Mobile env
cp mobile/.env.example mobile/.env
# Fill in API_BASE_URL, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID
```

### 3. Start database

```bash
docker compose up -d postgres
```

### 4. Setup database schema

```bash
cd backend
cp ../.env .env  # or symlink
npx prisma db push
npx prisma generate
cd ..
```

### 5. Run backend

```bash
cd backend && npm run start:dev
```

### 6. Run mobile

```bash
cd mobile

# iOS
cd ios && bundle install && bundle exec pod install && cd ..
npx react-native run-ios --device "YourDeviceName"

# Android
npx react-native run-android
```

### Or use the dev script

```bash
./scripts/dev.sh              # Start DB + backend + Metro
./scripts/dev.sh device       # + build to device
./scripts/dev.sh stop         # Stop everything
./scripts/dev.sh status       # Check services
```

## Project Structure

```
wellvantage/
├── backend/                    # NestJS REST API
│   ├── prisma/schema.prisma   # Database schema (source of truth)
│   ├── src/
│   │   ├── auth/              # Google OAuth + JWT
│   │   ├── workouts/          # Workout plans, days, exercises
│   │   ├── clients/           # Client assignment & tracking
│   │   ├── availability/      # Scheduling with repeat rules
│   │   ├── sessions/          # Booking & session management
│   │   ├── common/            # Guards, decorators, filters, DTOs
│   │   └── config/            # Env validation
│   └── package.json
├── mobile/                    # React Native CLI app
│   ├── src/
│   │   ├── screens/           # All app screens
│   │   ├── components/        # Reusable UI + DrawerMenu + ErrorBoundary
│   │   ├── navigation/        # React Navigation stacks
│   │   ├── stores/            # Zustand state management
│   │   ├── services/          # API client with Keychain auth
│   │   ├── theme/             # Design tokens & typography
│   │   ├── types/             # Shared TypeScript interfaces
│   │   └── utils/             # Helpers & config
│   ├── ios/                   # Native iOS project
│   └── android/               # Native Android project
├── scripts/dev.sh             # Dev runner script
├── docker-compose.yml         # PostgreSQL + pgAdmin
└── CLAUDE.md                  # Development standards
```

## API Endpoints

| Module | Endpoints | Auth |
|--------|-----------|------|
| Auth | 4 (google, callback, token, me) | Public + JWT |
| Workouts | 11 (plans + days + exercises CRUD) | JWT + Roles |
| Clients | 5 (CRUD + assignment) | JWT + Roles |
| Availability | 8 (CRUD + booking + slots) | JWT + Roles |
| Sessions | 7 (CRUD + upcoming + past + stats) | JWT + Roles |

## Database

View data via:
- **pgAdmin**: http://localhost:5050 (admin@wellvantage.dev / admin123)
- **Prisma Studio**: `cd backend && npx prisma studio`
- **DBeaver**: Connect to localhost:5433, database: wellvantage

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project
3. Create **Web** OAuth Client ID → add to `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
4. Create **iOS** OAuth Client ID (bundle: `com.wellvantage.app`) → add to `mobile/.env` as `GOOGLE_IOS_CLIENT_ID`
5. Add the reversed iOS client ID as a URL scheme in `mobile/ios/WellVantage/Info.plist`

## Scripts

```bash
# Backend
npm run start:dev          # Dev server with hot reload
npm run build              # Production build
npm run lint               # ESLint
npm run format             # Prettier

# Mobile
npx react-native start    # Metro bundler
npx react-native run-ios  # Build + run iOS
npm run lint               # ESLint
npm run format             # Prettier

# Database
npx prisma db push         # Sync schema to DB
npx prisma studio          # Visual DB browser
npx prisma migrate dev     # Create migration
```

## Architecture Decisions

- **1-row repeat rules** — recurring availability stored as a single DB row with `repeatFrequency` + `repeatUntil`, expanded to virtual dates on read
- **Monthly data fetching** — calendar screens fetch only the visible month's data via date range API
- **Zustand over Redux** — lightweight, no boilerplate, perfect for this scale
- **KeyboardScrollView** — shared component for consistent keyboard handling across all screens
- **SVG icons** — custom `react-native-svg` icons instead of icon font libraries (smaller bundle)

## License

Private — All rights reserved.
