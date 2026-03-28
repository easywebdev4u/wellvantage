# WellVantage Architecture Document

> Comprehensive system architecture reference for developer onboarding.
> Last updated: 2026-03-27

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Pattern](#2-architecture-pattern)
3. [Backend Architecture](#3-backend-architecture)
4. [Mobile Architecture](#4-mobile-architecture)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [Security Architecture](#6-security-architecture)
7. [Database Schema](#7-database-schema)
8. [API Design](#8-api-design)
9. [Scalability Considerations](#9-scalability-considerations)
10. [Technical Debt and Future Work](#10-technical-debt-and-future-work)

---

## 1. System Overview

### What the App Does

WellVantage is a **Personal Training Gym Management** platform. It enables gym owners and personal trainers to manage workout plans, client relationships, trainer availability, booking slots, and training sessions from a single mobile application backed by a REST API.

### Who Uses It

The system defines three user roles:

| Role      | Capabilities |
|-----------|-------------|
| **OWNER** | Full access to all data across all trainers. Can manage any workout, client, availability, or session. |
| **TRAINER** | Manages their own workout plans, their assigned clients, their own availability slots, and their own sessions. |
| **CLIENT** | Read-only access to their own assigned workout plans, their own client profile, and their trainer's availability. Cannot create or modify any records. |

### High-Level Data Flow

```
+------------------+        HTTPS / JSON        +------------------+        SQL         +------------------+
|                  |  ----------------------->  |                  |  --------------->  |                  |
|  React Native    |    Bearer JWT in header    |  NestJS API      |    Prisma ORM      |  PostgreSQL      |
|  Mobile App      |  <-----------------------  |  (port 3000)     |  <---------------  |  Database        |
|                  |    JSON response bodies    |                  |    Query results    |                  |
+------------------+                            +------------------+                    +------------------+
        |                                               |
        |  Google Sign-In SDK                          |  Google OAuth2 / ID Token
        |  (native iOS)                                |  verification
        v                                               v
+------------------+                            +------------------+
|  Google OAuth    |  <---------------------->  |  google-auth-    |
|  Servers         |                            |  library         |
+------------------+                            +------------------+
```

---

## 2. Architecture Pattern

### Backend: Modular Monolith (NestJS Module Architecture)

The backend follows NestJS's **modular architecture** with clear separation of concerns per domain boundary. Each domain (auth, workouts, clients, availability, sessions) is a self-contained NestJS module with its own controller, service, and DTOs. Cross-cutting concerns (Prisma, guards, filters, decorators) live in shared modules.

This is closer to a **layered architecture** within each module:

```
Controller Layer    -- HTTP routing, validation, auth guards
       |
Service Layer       -- Business logic, access control, data transformation
       |
Data Access Layer   -- Prisma ORM (global singleton)
       |
PostgreSQL          -- Persistent storage
```

### Mobile: Feature-Based with Zustand Stores

The mobile app follows a **feature-based architecture** with:

- **Navigation** as the structural backbone (RootNavigator splits auth vs. app)
- **Zustand stores** as the single source of truth per domain (auth, workouts, clients, availability, sessions)
- **Screens** as feature entry points
- **Shared UI components** as a mini design system

### How Modules Connect

```
+------------------------------------------------------------+
|                      AppModule (root)                       |
|                                                            |
|  ConfigModule (global)    ThrottlerModule (global guard)   |
|                                                            |
|  +----------+  +---------+  +--------+  +--------+  +----+|
|  | AuthModule|  |Workouts |  |Clients |  |Avail.  |  |Sess||
|  |          |  |Module   |  |Module  |  |Module  |  |Mod ||
|  +----------+  +---------+  +--------+  +--------+  +----+|
|       |              |            |           |          |  |
|       +------+-------+-----+-----+-----+-----+----+-----+  |
|              |              |                 |              |
|         PrismaModule (global -- provides PrismaService)     |
+------------------------------------------------------------+
```

Each feature module imports nothing from other feature modules. They all depend on `PrismaModule` (global) and use shared decorators/guards from `common/`.

---

## 3. Backend Architecture

### 3.1 Module Structure

```
backend/src/
  main.ts                          -- Bootstrap, helmet, CORS, global pipes/filters
  app.module.ts                    -- Root module, imports all feature modules
  config/
    env.validation.ts              -- Joi schema for .env validation
  prisma/
    prisma.service.ts              -- PrismaClient wrapper with lifecycle hooks
    prisma.module.ts               -- Global module exporting PrismaService
  common/
    index.ts                       -- Barrel exports
    decorators/
      current-user.decorator.ts    -- @CurrentUser() param decorator
      roles.decorator.ts           -- @Roles() metadata decorator
    guards/
      roles.guard.ts               -- RolesGuard: checks user.role against @Roles()
    filters/
      all-exceptions.filter.ts     -- Global exception filter (HTTP + Prisma errors)
    dto/
      pagination.dto.ts            -- Reusable PaginationDto with skip getter
  auth/
    auth.module.ts                 -- Passport + JWT module config
    auth.controller.ts             -- Google OAuth redirect, token exchange, /me
    auth.service.ts                -- Google ID token verification, user upsert, JWT signing
    strategies/
      google.strategy.ts           -- Passport Google OAuth2 strategy
      jwt.strategy.ts              -- Passport JWT strategy (Bearer token)
    interfaces/
      auth.interfaces.ts           -- GoogleProfile, JwtPayload, AuthenticatedUser, AuthResponse
    dto/
      google-token.dto.ts          -- GoogleTokenDto (idToken validation)
  workouts/
    workouts.module.ts
    workouts.controller.ts         -- CRUD for plans, days, exercises
    workouts.service.ts            -- Business logic with ownership checks
    dto/
      create-workout.dto.ts        -- Nested validation (plan > days > exercises)
      update-workout.dto.ts        -- Partial update DTOs
  clients/
    clients.module.ts
    clients.controller.ts          -- CRUD for client records
    clients.service.ts             -- Client management with trainer ownership
    dto/
      create-client.dto.ts
      update-client.dto.ts
  availability/
    availability.module.ts
    availability.controller.ts     -- CRUD + booking operations
    availability.service.ts        -- Repeat expansion, overlap detection, slot management
    dto/
      create-availability.dto.ts   -- Time format validation (HH:MM AM/PM regex)
      availability-query.dto.ts    -- Date range + trainer filter queries
      book-slot.dto.ts
      update-slot.dto.ts
  sessions/
    sessions.module.ts
    sessions.controller.ts         -- CRUD + stats + upcoming/past filters
    sessions.service.ts            -- Session management with status transitions
    dto/
      create-session.dto.ts
      update-session.dto.ts
```

### 3.2 Request Lifecycle

Every API request follows this pipeline:

```
HTTP Request
    |
    v
[helmet]                    -- Security headers (X-Frame-Options, CSP, etc.)
    |
    v
[ThrottlerGuard]            -- Global rate limiting (30 req / 60s default)
    |
    v
[AuthGuard('jwt')]          -- Passport JWT extraction from Authorization header
    |                         Calls JwtStrategy.validate() which loads user from DB
    v
[RolesGuard]                -- Reads @Roles() metadata, compares against user.role
    |                         Returns true if no roles required, or user.role matches
    v
[ValidationPipe]            -- class-validator + class-transformer
    |                         whitelist: true (strips unknown props)
    |                         forbidNonWhitelisted: true (rejects unknown props)
    |                         transform: true (auto-converts types)
    v
[Controller Method]         -- Route handler with @CurrentUser(), @Body(), @Param()
    |
    v
[Service Method]            -- Business logic, access control assertions
    |
    v
[PrismaService]             -- Database queries via Prisma Client
    |
    v
[AllExceptionsFilter]       -- Catches all unhandled errors
    |                         Maps Prisma P2002 -> 409, P2025 -> 404
    |                         Maps HttpException -> correct status
    |                         Returns { statusCode, message, timestamp }
    v
HTTP Response (JSON)
```

### 3.3 Authentication Flow

The system supports two Google authentication paths:

**Path A: OAuth2 Redirect (web/fallback)**
1. Client visits `GET /api/auth/google`
2. `AuthGuard('google')` redirects to Google consent screen
3. Google redirects to `GET /api/auth/google/callback`
4. `GoogleStrategy.validate()` extracts profile, calls `authService.validateGoogleUser()`
5. User is upserted in DB (create if new, update name/avatar if existing)
6. Controller generates JWT, redirects to `wellvantage://auth/callback?token=...&userId=...`

**Path B: ID Token Exchange (mobile -- primary path)**
1. Mobile app uses `@react-native-google-signin/google-signin` to get an `idToken` from Google
2. Mobile posts `POST /api/auth/google/token` with `{ idToken }`
3. `AuthService.validateGoogleIdToken()` verifies the token with `google-auth-library`
4. User is upserted in DB
5. JWT is generated and returned as `{ accessToken, user }`
6. Mobile stores token in iOS Keychain via `react-native-keychain`

**JWT Structure:**
```json
{
  "sub": "<user.id (UUID)>",
  "email": "<user.email>",
  "role": "<OWNER|TRAINER|CLIENT>",
  "iat": 1234567890,
  "exp": 1234567890  // 7 days from issuance
}
```

### 3.4 Authorization Model

Authorization operates at two levels:

**Level 1: Role-Based Access Control (RBAC) via Guards**

The `@Roles()` decorator and `RolesGuard` enforce which roles can access a route:

| Endpoint Pattern | Allowed Roles |
|-----------------|---------------|
| `GET` (read operations) | All authenticated users |
| `POST`, `PUT`, `DELETE` (write operations) | OWNER, TRAINER |
| Sessions create/update/delete | OWNER, TRAINER |

**Level 2: Ownership-Based Access Control in Services**

Each service implements `assertAccess()` and `assertWriteAccess()` methods:

| Role | Read Access | Write Access |
|------|------------|-------------|
| OWNER | All records | All records |
| TRAINER | Only own records (`trainerId === userId`) | Only own records |
| CLIENT | Only own profile / assigned plans | None (ForbiddenException) |

The pattern is consistent across all services:

```typescript
private assertAccess(trainerId: string, userId: string, role: Role) {
  if (role === 'OWNER') return;                              // Full access
  if (role === 'TRAINER' && trainerId !== userId) throw;     // Own records only
  // CLIENT access is handled by the query WHERE clause
}

private assertWriteAccess(trainerId: string, userId: string, role: Role) {
  if (role === 'CLIENT') throw;                              // No write access
  if (role === 'TRAINER' && trainerId !== userId) throw;     // Own records only
}
```

### 3.5 Database Design

See [Section 7](#7-database-schema) for the full schema.

### 3.6 Error Handling Strategy

The `AllExceptionsFilter` is a global catch-all filter:

```
Exception Type                     -> HTTP Status  -> Message
-------------------------------------------------------------------
HttpException                      -> exception's   -> exception's message
                                      status

Prisma P2002 (unique constraint)   -> 409 Conflict  -> "A record with this value already exists"
Prisma P2025 (record not found)    -> 404 Not Found -> "Record not found"
Other Prisma errors                -> 500            -> "Internal server error" (logged)

Other Error instances               -> 500            -> "Internal server error" (logged with stack)
Unknown                             -> 500            -> "Internal server error"
```

All error responses have a consistent shape:
```json
{
  "statusCode": 404,
  "message": "Record not found",
  "timestamp": "2026-03-27T10:30:00.000Z"
}
```

### 3.7 Security Layers

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| **Helmet** | `app.use(helmet())` in main.ts | Sets secure HTTP headers (CSP, X-Frame-Options, etc.) |
| **Rate Limiting** | `ThrottlerModule` as global APP_GUARD | 30 requests per 60 seconds per IP (configurable via env) |
| **CORS** | `app.enableCors()` with allowlist | Only configured origins can make requests; credentials enabled |
| **Input Validation** | `ValidationPipe` with `whitelist + forbidNonWhitelisted` | Strips/rejects unknown fields, validates types, transforms values |
| **Environment Validation** | Joi schema in `env.validation.ts` | Fails fast at startup if required env vars are missing or invalid. JWT_SECRET must be >= 32 chars. |
| **Authentication** | Passport JWT strategy with DB lookup | Every request validates JWT and confirms user still exists in DB |
| **Authorization** | RolesGuard + service-level assertions | Two-layer access control (role gates + ownership checks) |
| **Prisma Error Mapping** | AllExceptionsFilter | Prevents leaking internal DB errors to clients |

---

## 4. Mobile Architecture

### 4.1 Navigation Structure

```
App (root component)
  |
  GestureHandlerRootView
    ErrorBoundary
      SafeAreaProvider
        NavigationContainer
          RootNavigator
            |
            +-- [isAuthenticated = false] --> AuthNavigator
            |     |
            |     +-- SignUpScreen (Google Sign-In)
            |
            +-- [isAuthenticated = true] --> AppNavigator
                  |
                  +-- WorkoutManagement (home, contains tab system)
                  +-- AddEditWorkout (push, slide_from_right)
                  +-- AssignedClients (push, slide_from_right)
                  +-- BookClientSlots (push, slide_from_right)
                  +-- SetAvailability (push, slide_from_right)
```

Key design decisions:
- **No bottom tab navigator** -- Instead, `WorkoutManagementScreen` implements a custom `TabBar` component that renders different screen content inline (Workout, Client, Availability, Book Slots).
- **Auth gating in RootNavigator** -- Uses Zustand `isAuthenticated` selector to conditionally render Auth or App stacks. No route-level auth checks needed.
- **Loading splash** -- While `isLoading` is true (token being loaded from Keychain), shows a centered ActivityIndicator.

### 4.2 State Management (Zustand Stores)

Five Zustand stores, one per domain:

| Store | File | State | Key Operations |
|-------|------|-------|---------------|
| `useAuthStore` | `auth.store.ts` | user, token, isLoading, isAuthenticated | setAuth, loadToken, logout |
| `useWorkoutStore` | `workout.store.ts` | plans[], selectedPlan, total, page | fetchPlans, fetchPlan, createPlan, updatePlan, deletePlan, addDay, deleteDay, addExercise, updateExercise, deleteExercise |
| `useClientStore` | `client.store.ts` | clients[], selectedClient, total, page | fetchClients, fetchClient, createClient, updateClient, deleteClient |
| `useAvailabilityStore` | `availability.store.ts` | slots[], currentStartDate, currentEndDate | fetchAvailability, fetchMonth, createAvailability, deleteAvailability, bookSlot |
| `useSessionStore` | `session.store.ts` | sessions[], upcoming[], past[], stats | fetchSessions, fetchUpcoming, fetchPast, createSession, updateSession, fetchStats |

**Selector Pattern**: Components use individual property selectors to minimize re-renders:
```typescript
const plans = useWorkoutStore((s) => s.plans);       // Only re-renders when plans changes
const isLoading = useWorkoutStore((s) => s.isLoading); // Only re-renders when isLoading changes
```

**Error Handling Pattern**: Each store has an `error: string | null` field and a `clearError()` method. Operations set the error on failure and clear it before new operations.

**Re-fetch After Mutation Pattern**: After mutations (create/delete), stores re-fetch the current view data to ensure consistency. The availability store uses `currentStartDate`/`currentEndDate` to remember what month was being viewed and re-fetches after changes.

### 4.3 API Layer

The API layer (`services/api.ts`) is built on axios with three key mechanisms:

**Token Management:**
- Tokens are stored in iOS Keychain via `react-native-keychain` (service name: `wellvantage_auth`)
- `storeToken(token)`, `getToken()`, `clearToken()` are the Keychain interface

**Request Interceptor:**
- Automatically reads the JWT from Keychain and attaches it as `Authorization: Bearer <token>` on every request

**Response Interceptor (401 handling):**
- On any 401 response: clears the Keychain token, calls `onUnauthorized()` callback
- The callback is set at app startup to `useAuthStore.logout()`, which resets auth state and forces navigation to the sign-in screen
- This creates an automatic session expiry/invalidation flow

**Exported functions:**
```typescript
get<T>(url, config?)      // GET request, returns response.data
post<T>(url, data?, config?) // POST request, returns response.data
put<T>(url, data?, config?)  // PUT request, returns response.data
del<T>(url, config?)      // DELETE request, returns response.data
```

**Environment Configuration:**
- DEV: `http://192.168.1.39:3000/api` (configurable via react-native-config)
- PROD: `https://api.wellvantage.com/api`
- Auto-selected via `__DEV__` flag

### 4.4 Component Hierarchy

```
Screens (feature entry points)
  |
  +-- WorkoutManagementScreen
  |     +-- Header (with MenuIcon, DrawerMenu)
  |     +-- TabBar (animated indicator, horizontal scroll)
  |     +-- [Tab 0] Workout tab (FlatList of WorkoutPlan cards)
  |     +-- [Tab 1] ClientListScreen (FlatList of Client cards)
  |     +-- [Tab 2] SetAvailabilityScreen (Calendar + form)
  |     +-- [Tab 3] BookClientSlotsScreen (Calendar + slot list)
  |
  +-- AddEditWorkoutScreen
  |     +-- Header (with back button)
  |     +-- KeyboardScrollView
  |     +-- Input (plan name)
  |     +-- Day pills (interactive day selector)
  |     +-- Exercise table (Sets/Reps columns)
  |     +-- Notes textarea
  |
  +-- AssignedClientsScreen
  |     +-- Header (with back button)
  |     +-- Client cards (avatar, info, WhatsApp/Phone actions)
  |     +-- Upcoming Sessions table (with cancel action)
  |     +-- Past Sessions table
  |
  +-- SignUpScreen
        +-- LinearGradient background
        +-- Animated logo + branding
        +-- Google Sign-In button

Shared UI Components (components/ui/)
  |
  +-- Button       -- Variants: primary, secondary, outline, ghost. Sizes: sm, md, lg
  +-- Input        -- Animated border (Reanimated), label, error, left/right icons
  +-- Card         -- Surface container with shadow
  +-- Header       -- Green bar with safe area, back button, left/right icon slots
  +-- TabBar       -- Horizontally scrollable tabs with animated underline indicator
  +-- KeyboardScrollView -- ScrollView with automaticallyAdjustKeyboardInsets
  +-- TrashIcon    -- SVG trash icon
  +-- CalendarIcon -- SVG calendar icon
  +-- MenuIcon     -- SVG hamburger icon
  +-- DrawerMenu   -- Modal-based slide-in drawer with profile, menu items, logout
  +-- ErrorBoundary -- Class component error boundary with retry
```

### 4.5 Keyboard Handling

The `KeyboardScrollView` component wraps `ScrollView` with:
- `keyboardShouldPersistTaps="handled"` -- taps outside inputs dismiss keyboard
- `automaticallyAdjustKeyboardInsets` -- iOS native keyboard avoidance
- `contentContainerStyle={{ paddingBottom: extraKeyboardOffset }}` -- extra bottom padding (default 30px)

This is used in `AddEditWorkoutScreen`, `SetAvailabilityScreen`, and `BookClientSlotsScreen` where forms appear below the fold.

### 4.6 Performance Patterns

| Pattern | Usage |
|---------|-------|
| `React.memo()` | All shared UI components (Button, Input, Card, Header, TabBar, etc.) and screen-level components (ClientListScreen, SetAvailabilityScreen, DrawerMenu) |
| `useCallback()` | All event handlers and render functions passed as props |
| Individual Zustand selectors | `useStore((s) => s.specificField)` instead of `useStore()` to prevent full-store re-renders |
| `FlatList` with `keyExtractor` | Used for workout plans and client lists instead of mapping in ScrollView |
| Staggered entry animations | `FadeInDown.delay(index * 60)` -- items animate in sequence but only first ~8 are delayed |
| `Reanimated` shared values | TabBar indicator, Input border animation, toggle switch -- all run on UI thread |
| Haptic feedback | `react-native-haptic-feedback` for tactile response on all interactive elements |

---

## 5. Data Flow Diagrams

### 5.1 Authentication Flow (Google -> Backend -> JWT -> Keychain -> API Calls)

```
Mobile App                     Backend API                   Google Servers
    |                              |                              |
    |  1. GoogleSignin.signIn()    |                              |
    |  --------------------------->|                              |
    |                              |                              |
    |           (native iOS Google Sign-In SDK)                   |
    |  <-----------------------------------------------------------
    |     { idToken }              |                              |
    |                              |                              |
    |  2. POST /auth/google/token  |                              |
    |     { idToken }              |                              |
    |  --------------------------->|                              |
    |                              |  3. googleClient.verifyIdToken()
    |                              |  --------------------------->|
    |                              |  <---------------------------
    |                              |     payload { sub, email,    |
    |                              |               name, picture }|
    |                              |                              |
    |                              |  4. prisma.user.upsert()
    |                              |     (googleId -> User)
    |                              |
    |                              |  5. jwt.sign({ sub, email, role })
    |                              |
    |  <---------------------------
    |     { accessToken, user }
    |
    |  6. Keychain.setGenericPassword('token', accessToken)
    |
    |  7. zustand: set({ token, user, isAuthenticated: true })
    |
    |  --- All subsequent API calls ---
    |
    |  8. axios interceptor reads Keychain -> Authorization: Bearer <token>
    |  --------------------------->|
    |                              |  9. JwtStrategy extracts + verifies token
    |                              |     Loads user from DB
    |                              |     Attaches to request.user
    |                              |
    |  <---------------------------
    |     JSON response
```

### 5.2 Workout CRUD Flow (Screen -> Store -> API -> DB)

```
AddEditWorkoutScreen                   WorkoutStore              API Service              Backend
        |                                   |                        |                      |
        |  1. User fills form, taps Submit  |                        |                      |
        |  createPlan(data) --------------->|                        |                      |
        |                                   |  set({ isLoading })    |                      |
        |                                   |                        |                      |
        |                                   |  2. post('/workouts',  |                      |
        |                                   |       data) ---------->|                      |
        |                                   |                        |  POST /api/workouts  |
        |                                   |                        |  ------------------->|
        |                                   |                        |                      |
        |                                   |                        |  ValidationPipe:     |
        |                                   |                        |    validates nested   |
        |                                   |                        |    plan > days > exs  |
        |                                   |                        |                      |
        |                                   |                        |  WorkoutsService:    |
        |                                   |                        |    prisma.workoutPlan|
        |                                   |                        |    .create({ data,   |
        |                                   |                        |      workoutDays: {  |
        |                                   |                        |        create: [...] |
        |                                   |                        |        exercises: {  |
        |                                   |                        |          create:[..]}}|
        |                                   |                        |    })                |
        |                                   |                        |                      |
        |                                   |                        |  <-------------------
        |                                   |  <---------------------   WorkoutPlan (with   |
        |                                   |     plan object           nested includes)    |
        |                                   |                        |                      |
        |                                   |  3. set({ plans: [plan, ...prev],             |
        |                                   |          isLoading: false })                   |
        |  <--------------------------------                         |                      |
        |     re-render with new plan       |                        |                      |
```

### 5.3 Availability Repeat Expansion Flow (1 DB Row -> N Virtual Slots)

```
Trainer creates:
  date: "2026-04-01"
  startTime: "9:00 AM"
  endTime: "9:45 AM"
  isRepeat: true
  repeatFrequency: "WEEKLY"
  repeatUntil: "2026-04-29"

                   DATABASE                          BACKEND SERVICE
              +------------------+            +---------------------------+
              | Availability     |            | AvailabilityService       |
              |                  |            |                           |
              | id: abc-123      |  findAll   | 1. Fetch from DB:         |
              | date: 2026-04-01 | ---------> |    WHERE date <= rangeEnd |
              | startTime: 9 AM  |            |    AND repeatUntil >=     |
              | endTime: 9:45 AM |            |    rangeStart             |
              | isRepeat: true   |            |                           |
              | repeatFreq: WKLY |            | 2. expandRepeatingSlot(): |
              | repeatUntil:     |            |    start = 2026-04-01     |
              |   2026-04-29     |            |    while (current <= until)|
              +------------------+            |      if (in range)        |
                                              |        push virtual copy  |
                   1 ROW                      |      current += 7 days    |
                                              |                           |
                                              | 3. Returns 5 virtual slots|
                                              +---------------------------+

             RETURNED TO MOBILE (for April 2026):
             +-----------------------------------------------+
             | { ...slot, date: "2026-04-01", _virtualDate }  |
             | { ...slot, date: "2026-04-08", _virtualDate }  |
             | { ...slot, date: "2026-04-15", _virtualDate }  |
             | { ...slot, date: "2026-04-22", _virtualDate }  |
             | { ...slot, date: "2026-04-29", _virtualDate }  |
             +-----------------------------------------------+
                         5 VIRTUAL SLOTS
```

**Overlap Detection on Create:**
When creating a new availability, the service:
1. Generates ALL dates the new slot would occupy (single or recurring)
2. Fetches ALL existing availability for the trainer in the date range
3. Expands existing slots into their virtual dates
4. Checks every new date/time against every existing date/time
5. Throws `ConflictException` if any overlap is found

### 5.4 Monthly Calendar Fetch Flow

```
Mobile (SetAvailabilityScreen)          AvailabilityStore           Backend
        |                                     |                        |
        | 1. useEffect on mount:              |                        |
        |    fetchMonth(2026, 4)              |                        |
        | ---------------------------------->  |                        |
        |                                     | 2. Compute range:      |
        |                                     |    start = 2026-04-01  |
        |                                     |    end   = 2026-04-30  |
        |                                     |                        |
        |                                     | 3. GET /availability   |
        |                                     |    ?startDate=2026-04-01
        |                                     |    &endDate=2026-04-30 |
        |                                     |    &limit=200          |
        |                                     | ---------------------->|
        |                                     |                        |
        |                                     |   Backend expands all  |
        |                                     |   repeating slots,     |
        |                                     |   returns virtual list |
        |                                     |                        |
        |                                     | <----------------------|
        |                                     |   { data: [...slots],  |
        |                                     |     total, page, limit}|
        |                                     |                        |
        |                                     | 4. set({ slots, currentStartDate,
        |                                     |         currentEndDate })
        | <-----------------------------------                         |
        | 5. Calendar renders dots on dates   |                        |
        |    that have slots (markedDates     |                        |
        |    computed via useMemo)            |                        |
```

---

## 6. Security Architecture

### End-to-End Security Measures

```
MOBILE DEVICE                    NETWORK                     SERVER                      DATABASE
+-------------------+     +------------------+     +----------------------+     +------------------+
| Keychain storage  |     | HTTPS (TLS)      |     | helmet() headers     |     | PostgreSQL       |
| for JWT           |     | (in production)  |     |                      |     | with indexes     |
|                   |     |                  |     | ThrottlerGuard       |     |                  |
| Google Sign-In    |     | Bearer JWT in    |     | (rate limiting)      |     | Prisma generated |
| (native SDK)     |     | Authorization    |     |                      |     | parameterized    |
|                   |     | header           |     | CORS allowlist       |     | queries (no SQL  |
| 401 auto-logout  |     |                  |     |                      |     | injection)       |
|                   |     |                  |     | ValidationPipe       |     |                  |
| No secrets in    |     |                  |     | (whitelist, strict)  |     | Cascade deletes  |
| source code      |     |                  |     |                      |     | for referential  |
|                   |     |                  |     | JWT verification     |     | integrity        |
| react-native-    |     |                  |     | (every request)      |     |                  |
| config for env   |     |                  |     |                      |     | UUID primary keys|
|                   |     |                  |     | Role-based guards    |     | (non-sequential) |
|                   |     |                  |     |                      |     |                  |
|                   |     |                  |     | Ownership assertions |     |                  |
|                   |     |                  |     | (service layer)      |     |                  |
|                   |     |                  |     |                      |     |                  |
|                   |     |                  |     | Env validation at    |     |                  |
|                   |     |                  |     | startup (Joi)        |     |                  |
|                   |     |                  |     |                      |     |                  |
|                   |     |                  |     | Error sanitization   |     |                  |
|                   |     |                  |     | (no stack traces     |     |                  |
|                   |     |                  |     | in responses)        |     |                  |
+-------------------+     +------------------+     +----------------------+     +------------------+
```

### Security Measures Summary

| Layer | Measure | Details |
|-------|---------|---------|
| Transport | HTTPS | Required in production; dev uses HTTP |
| Headers | Helmet | Sets `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, etc. |
| Rate Limiting | ThrottlerGuard | 30 requests / 60 seconds per client (configurable via `THROTTLE_TTL`, `THROTTLE_LIMIT`) |
| Origin Control | CORS | Configured allowlist of origins; credentials mode enabled |
| Input Validation | class-validator + ValidationPipe | Whitelist mode strips unknown fields; `forbidNonWhitelisted` rejects them; type transformation; regex patterns for time formats |
| Authentication | JWT (7-day expiry) | Extracted from Bearer token; validated against DB on every request |
| Authorization | RBAC + Ownership | Two layers: route-level role gates and service-level ownership checks |
| Token Storage (Mobile) | iOS Keychain | Secure enclave storage; not accessible to other apps |
| Session Invalidation | 401 interceptor | Auto-clears token and logs out on any 401 |
| Secrets Management | Environment variables | Joi validation at boot; JWT_SECRET requires 32+ characters |
| SQL Injection | Prisma ORM | All queries are parameterized by default |
| Error Leakage | AllExceptionsFilter | Internal errors return generic messages; Prisma errors are mapped to HTTP codes |

---

## 7. Database Schema

### Entity-Relationship Diagram (ASCII)

```
+------------------+       +---------------------+       +------------------+
|      User        |       |    WorkoutPlan       |       |   WorkoutDay     |
+------------------+       +---------------------+       +------------------+
| id          UUID |<------| trainerId       UUID |       | id          UUID |
| email     STRING |  1:N  | id              UUID |<------| workoutPlanId    |
| name      STRING |       | name          STRING |  1:N  | dayNumber    INT |
| avatarUrl STRING?|       | description   STRING?|       | muscleGroup  STR |
| role        Role |       | days             INT |       +------------------+
| googleId STRING? |       | isPrebuilt      BOOL |              |
| createdAt   DATE |       | createdAt       DATE |              | 1:N
| updatedAt   DATE |       | updatedAt       DATE |              v
+------------------+       +---------------------+       +------------------+
      |    |    |                  |                       |    Exercise     |
      |    |    |                  | 1:N                   +------------------+
      |    |    |                  v                       | id          UUID |
      |    |    |          +------------------+            | name      STRING |
      |    |    |          |     Client       |            | sets         INT |
      |    |    +--------->| trainerId   UUID |            | reps        INT? |
      |    | 1:N    1:1    | userId      UUID |<-----+     | duration STRING? |
      |    |         +---->| workoutPlanId UUID?|     |     | order        INT |
      |    |         |     | planName   STRING? |     |     | workoutDayId UUID|
      |    |         |     | totalSessions  INT |     |     +------------------+
      |    |         |     | sessionsRemain INT |     |
      |    |         |     | phone     STRING?  |     |
      |    |         |     | whatsapp  STRING?  |     |
      |    |         |     +------------------+ |     |
      |    |         |            |    |         |     |
      |    |         |            |    | 1:N     |     |
      |    |         |            |    v         |     |
      |    |         |     +------------------+  |     |
      |    |         |     |  BookingSlot     |  |     |
      |    |         |     +------------------+  |     |
      |    |         |     | id          UUID |  |     |
      |    |         |     | availabilityId   |--+--+  |
      |    |         |     | clientId    UUID?|--+  |  |
      |    |         |     | status SlotStatus|     |  |
      |    |         |     | bookedAt   DATE? |     |  |
      |    |         |     +------------------+     |  |
      |    |         |                              |  |
      | 1:N         |     +------------------+     |  |
      +------------>|     |  Availability    |     |  |
      |             |     +------------------+     |  |
      |             |     | id          UUID |<----+  |
      |             |     | trainerId   UUID |--------+
      |             |     | date        DATE |
      |             |     | startTime STRING |
      |             |     | endTime   STRING |
      |             |     | isRepeat    BOOL |
      |             |     | repeatFreq ENUM? |
      |             |     | repeatUntil DATE?|
      |             |     | sessionName STR? |
      |             |     +------------------+
      |
      | 1:N (TrainerSessions)
      v
+------------------+
|    Session       |
+------------------+
| id          UUID |
| trainerId   UUID |
| clientId    UUID |
| date        DATE |
| startTime STRING |
| endTime   STRING |
| status  SessStatus|
| createdAt   DATE |
| updatedAt   DATE |
+------------------+
```

### Enums

| Enum | Values |
|------|--------|
| Role | OWNER, TRAINER, CLIENT |
| SlotStatus | OPEN, BOOKED, CANCELLED |
| SessionStatus | UPCOMING, COMPLETED, CANCELLED |
| RepeatFrequency | DAILY, WEEKLY |

### Indexes

| Model | Index | Purpose |
|-------|-------|---------|
| User | `@@index([email])` | Fast email lookups |
| User | `@@index([googleId])` | Fast Google ID lookups during auth |
| WorkoutPlan | `@@index([trainerId])` | Filter plans by trainer |
| WorkoutDay | `@@unique([workoutPlanId, dayNumber])` | Prevent duplicate day numbers per plan |
| WorkoutDay | `@@index([workoutPlanId])` | Fast lookup of days for a plan |
| Exercise | `@@index([workoutDayId])` | Fast lookup of exercises for a day |
| Client | `@@index([trainerId])` | Filter clients by trainer |
| Client | `@@index([workoutPlanId])` | Find clients on a plan |
| Client | `@unique userId` | One client profile per user |
| Availability | `@@index([trainerId, date])` | Monthly calendar queries |
| BookingSlot | `@@index([availabilityId])` | Slots per availability |
| BookingSlot | `@@index([clientId])` | Bookings per client |
| BookingSlot | `@@index([status])` | Filter by slot status |
| Session | `@@index([trainerId, date])` | Trainer schedule queries |
| Session | `@@index([clientId])` | Client session history |
| Session | `@@index([status])` | Filter by session status |
| Session | `@@index([trainerId, date, status])` | Composite for trainer + date + status queries |

### Key Design Decisions

1. **Repeat Availability as Single Row**: Repeating availability is stored as ONE row with `isRepeat`, `repeatFrequency`, and `repeatUntil` fields. Virtual occurrences are computed at read time by `expandRepeatingSlot()`. This reduces storage dramatically but requires server-side expansion on every read.

2. **Client as a Separate Entity from User**: A `Client` is a relationship entity linking a `User` (the person) to a `User` (the trainer), with additional metadata (sessions, plan assignment, contact info). This allows a single User to potentially have different trainer relationships.

3. **Times as Strings, Not Timestamps**: `startTime` and `endTime` are stored as human-readable strings (`"9:00 AM"`) rather than timestamps. This simplifies display but requires parsing for time arithmetic (see `timeToMinutes()` helper).

4. **Cascade Deletes**: Most foreign keys use `onDelete: Cascade` -- deleting a trainer deletes all their clients, plans, availability, and sessions. `workoutPlanId` on Client uses `onDelete: SetNull` to preserve client records when a plan is deleted.

5. **UUID Primary Keys**: All entities use UUIDs, preventing sequential ID enumeration attacks and enabling distributed ID generation.

---

## 8. API Design

### REST Conventions

All endpoints are prefixed with `/api` (set via `app.setGlobalPrefix('api')`).

| Method | Pattern | Purpose |
|--------|---------|---------|
| GET | `/resource` | List with pagination |
| GET | `/resource/:id` | Get single record |
| POST | `/resource` | Create new record |
| PUT | `/resource/:id` | Full update |
| PATCH | `/resource/:id` | Partial update (sessions, booking slots) |
| DELETE | `/resource/:id` | Delete record |

### Response Shapes

**Paginated List Response:**
```json
{
  "data": [{ ... }, { ... }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Single Entity Response:**
```json
{
  "id": "uuid",
  "name": "...",
  "trainer": { "id": "uuid", "name": "..." },
  "workoutDays": [{ ... }],
  "createdAt": "2026-03-27T...",
  "updatedAt": "2026-03-27T..."
}
```

**Delete Response:**
```json
{
  "deleted": true
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Start time must be before end time",
  "timestamp": "2026-03-27T10:30:00.000Z"
}
```

### Pagination Pattern

Pagination uses query parameters with a shared `PaginationDto`:

```
GET /api/workouts?page=2&limit=20
```

- `page` defaults to 1, minimum 1
- `limit` defaults to 10 (general) or 100 (availability), maximum 100 (general) or 200 (availability)
- The DTO computes `skip = (page - 1) * limit` for Prisma

### Full Endpoint Catalog

**Auth:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/google` | None | Redirect to Google OAuth |
| GET | `/auth/google/callback` | Google | OAuth callback, redirects with token |
| POST | `/auth/google/token` | None | Exchange Google ID token for JWT |
| GET | `/auth/me` | JWT | Get current user profile |

**Workouts:**
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/workouts` | All | List plans (filtered by role) |
| GET | `/workouts/:id` | All | Get plan with days and exercises |
| POST | `/workouts` | OWNER, TRAINER | Create plan (with nested days/exercises) |
| PUT | `/workouts/:id` | OWNER, TRAINER | Update plan metadata |
| DELETE | `/workouts/:id` | OWNER, TRAINER | Delete plan |
| POST | `/workouts/:planId/days` | OWNER, TRAINER | Add a day to a plan |
| PUT | `/workouts/days/:dayId` | OWNER, TRAINER | Update a day |
| DELETE | `/workouts/days/:dayId` | OWNER, TRAINER | Delete a day |
| POST | `/workouts/days/:dayId/exercises` | OWNER, TRAINER | Add exercise to a day |
| PUT | `/workouts/exercises/:exerciseId` | OWNER, TRAINER | Update an exercise |
| DELETE | `/workouts/exercises/:exerciseId` | OWNER, TRAINER | Delete an exercise |

**Clients:**
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/clients` | All | List clients (filtered by role) |
| GET | `/clients/:id` | All | Get client details |
| POST | `/clients` | All (trainer inferred) | Create client record |
| PUT | `/clients/:id` | OWNER, TRAINER | Update client |
| DELETE | `/clients/:id` | OWNER, TRAINER | Delete client |

**Availability:**
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/availability` | All | List with date range + repeat expansion |
| POST | `/availability` | OWNER, TRAINER | Create (with overlap detection) |
| DELETE | `/availability/:id` | OWNER, TRAINER | Delete (removes all virtual occurrences) |
| POST | `/availability/:id/book` | OWNER, TRAINER | Book a client into a slot |
| GET | `/availability/:id/slots` | All | Get booking slots for an availability |
| PATCH | `/availability/slots/:slotId` | OWNER, TRAINER | Update slot status |
| DELETE | `/availability/slots/:slotId` | OWNER, TRAINER | Remove a booking slot |

**Sessions:**
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/sessions` | All | List sessions (optional status filter) |
| GET | `/sessions/upcoming` | All | List upcoming sessions |
| GET | `/sessions/past` | All | List completed sessions |
| GET | `/sessions/stats` | All | Get counts by status |
| POST | `/sessions` | OWNER, TRAINER | Create a session |
| PATCH | `/sessions/:id` | OWNER, TRAINER | Update session status |
| DELETE | `/sessions/:id` | OWNER, TRAINER | Delete a session |

---

## 9. Scalability Considerations

### What Is Currently Optimized

| Area | Optimization |
|------|-------------|
| Database queries | Composite indexes on frequently filtered columns (trainerId+date, trainerId+date+status) |
| Pagination | All list endpoints support page/limit to avoid full table scans |
| Availability reads | Single DB query fetches both repeat and non-repeat slots; expansion is done in-memory |
| N+1 prevention | Prisma `include` clauses load related data in a single query |
| Mobile re-renders | Individual Zustand selectors, `React.memo`, `useCallback` throughout |
| Concurrent queries | `Promise.all` used for parallel `findMany` + `count` in all list operations |
| API response size | `select` clauses on includes limit returned fields to only what is needed |

### What Would Need Work at Scale

| Area | Current Limitation | Improvement Path |
|------|-------------------|-----------------|
| **Repeat expansion** | Expanding repeating availability happens in memory on every read. A trainer with many overlapping repeating rules and a 200-slot limit could become expensive. | Materialize virtual slots into the database on create, or cache expanded results in Redis. |
| **No caching** | Every request hits the database directly. No Redis or in-memory cache layer. | Add Redis caching for frequently read data (availability calendar, workout plans). |
| **No connection pooling** | Prisma's built-in connection pool is used, but no external pooler like PgBouncer. | Add PgBouncer for connection pooling at scale; configure Prisma pool size. |
| **Overlap detection on create** | The overlap check expands ALL existing availability in the date range, then does an O(n*m) comparison. For trainers with hundreds of slots, this could be slow. | Move overlap detection to a database constraint or stored procedure. |
| **No search** | No full-text search for workout plans, exercises, or clients. | Add PostgreSQL full-text search indexes or Elasticsearch. |
| **Single-server deployment** | No load balancing, no horizontal scaling. | Containerize with Docker, deploy behind a load balancer, use shared session store. |
| **JWT with no refresh** | 7-day tokens cannot be revoked server-side. If a user's role changes, the old JWT still grants the old role until expiry. | Implement refresh token rotation with short-lived access tokens (15 min) + long-lived refresh tokens. |
| **No pagination cursors** | Offset-based pagination becomes slow on large tables due to `OFFSET` scanning. | Switch to cursor-based pagination (keyset pagination) for large datasets. |
| **No background jobs** | Session status is never automatically transitioned (e.g., UPCOMING -> COMPLETED when the time passes). | Add a cron job or background worker (e.g., Bull queue) to auto-complete expired sessions. |
| **Client-side overlap check** | `SetAvailabilityScreen` does overlap checking locally against the slots already loaded. This is a convenience optimization that could miss overlaps with slots not yet loaded. | Server-side check (which already exists) is the authoritative source; client-side is advisory only. This is acceptable. |
| **Mobile state is not persisted** | All Zustand stores are in-memory. Closing the app loses all fetched data except the auth token. | Add Zustand `persist` middleware with MMKV or AsyncStorage for offline-first capability. |

---

## 10. Technical Debt and Future Work

### Known Gaps

| Area | Gap | Severity |
|------|-----|----------|
| **No tests** | Zero unit tests, integration tests, or E2E tests on both backend and mobile. | High |
| **No API documentation** | No Swagger/OpenAPI spec. Endpoint documentation exists only in code. | Medium |
| **No refresh tokens** | Single JWT with 7-day expiry. No token rotation or revocation mechanism. | Medium |
| **Missing ParseUUIDPipe** | Workouts controller does not use `ParseUUIDPipe` on `:id` params (clients and others do). Invalid UUIDs reach Prisma and cause 500 errors instead of 400. | Low |
| **Notes counter bug** | `AddEditWorkoutScreen` shows "X words remaining" but actually counts characters, not words. | Low |
| **Inconsistent HTTP methods** | Workouts uses PUT for updates; Sessions and BookingSlots use PATCH. Should be consistent. | Low |
| **No input sanitization** | While `class-validator` validates types/format, there is no HTML/XSS sanitization on string fields. | Medium |
| **No logging infrastructure** | Uses NestJS `Logger` which writes to stdout. No structured logging, no log aggregation. | Medium |
| **No health check endpoint** | No `/health` or `/ready` endpoint for load balancer or container orchestration. | Low |
| **Hardcoded dev IP** | `192.168.1.39` is hardcoded as fallback in `api.ts`. | Low |

### Missing Features (evident from UI placeholders)

| Feature | Evidence |
|---------|---------|
| **Profile editing** | DrawerMenu shows "My Profile" with `Alert('Coming Soon')` |
| **Dashboard / Analytics** | DrawerMenu shows "Dashboard" with `Alert('Coming Soon')` |
| **Settings / Notifications** | DrawerMenu shows "Settings" with `Alert('Coming Soon')` |
| **Client creation from mobile** | `ClientsController.create()` exists but no mobile UI for creating new clients |
| **Session creation from mobile** | `SessionsController.create()` exists but no mobile UI for creating sessions directly (only via booking) |
| **Session completion flow** | No UI for marking sessions as COMPLETED |
| **Client session tracking** | `sessionsRemaining` is set on create but never decremented when sessions are completed |

### Improvement Areas

1. **Add Swagger decorators** to all controllers for auto-generated API docs.
2. **Add comprehensive test suites** -- unit tests for services (mock Prisma), integration tests for controllers, E2E tests for auth flows.
3. **Implement refresh token rotation** with short-lived access tokens.
4. **Add WebSocket support** for real-time booking updates (a client books a slot and the trainer sees it immediately).
5. **Add push notifications** for session reminders, booking confirmations, and cancellations.
6. **Implement proper image upload** for user avatars (currently `avatarUrl` from Google only).
7. **Add database migrations** versioning strategy (Prisma migrate is available but no migration history is documented).
8. **Add a health check module** (`@nestjs/terminus`) for monitoring.
9. **Implement structured logging** with correlation IDs for request tracing.
10. **Add client-side data persistence** (Zustand persist + MMKV) for offline-first experience.
11. **Decrement `sessionsRemaining`** automatically when a session status is set to COMPLETED.
12. **Add `ParseUUIDPipe`** consistently to all UUID route parameters across all controllers.
