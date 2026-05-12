# Aurora Mental Health Tracking App 🌅

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Expo SDK](https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%7C_Auth_%7C_Functions-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Aurora is a comprehensive mental health tracking ecosystem developed as a capstone project at **Mindanao State University – Iligan Institute of Technology (MSU-IIT)**. It helps students monitor their emotional well-being through daily mood check-ins, AI-powered emotion detection, journaling, and breathing exercises — while giving counselors and administrators the tools to provide timely support.

> **Monorepo**: This repository contains the **Mobile App** (React Native / Expo), **Web Dashboard** (React / Vite), and **Cloud Functions** (Firebase).

**Repository**: [github.com/veegestable/Aurora-capstone](https://github.com/veegestable/Aurora-capstone)

---

## 🎯 Features

Aurora supports three user roles — **Student**, **Counselor**, and **Admin** — across both mobile and web platforms.

### 👨‍🎓 Student

| Feature | Mobile | Web | Description |
|---------|:------:|:---:|-------------|
| **Mood Check-In Wizard** | ✅ | ✅ | 4-step flow: mood selection → intensity/vitals (stress, energy, sleep) → context (academic load, social) → summary |
| **AI Emotion Detection** | ✅ | ✅ | Camera/webcam-based facial emotion analysis via external Hugging Face API |
| **Journal** | ✅ | ✅ | Mood log entries with calendar view and analytics tab (hourly trends, emotion frequency, bar charts) |
| **Breathing Exercises** | ✅ | ✅ | Guided breathing with animated circle and zen ambient audio (6 tracks: calm, focus, meditation, morning focus, sleep, stress release) |
| **Weekly AI Summaries** | ✅ | ✅ | AI-generated narrative mood summaries via Cloud Function (OpenRouter → GPT-4o-mini) |
| **Session Scheduling** | ✅ | ✅ | Request and confirm counseling sessions with time slot selection |
| **Direct Messaging** | ✅ | ✅ | Real-time chat with assigned counselor (chat bubbles, contact list) |
| **Announcements** | ✅ | ✅ | View school-wide announcements via banner/carousel |
| **Resources** | ✅ | ✅ | Browse wellness resources |
| **Profile Management** | ✅ | ✅ | Edit profile, privacy controls, toggle rows, settings |
| **Push Notifications** | ✅ | — | Expo Push Notifications for session invites and reminders |
| **Daily Selfie** | ✅ | — | Camera-based daily mood capture |
| **Streak Counter** | ✅ | — | Consecutive check-in streak tracking |
| **Onboarding Tour** | ✅ | — | Spotlight overlay guiding first-time users through the dashboard |

### 👨‍⚕️ Counselor

| Feature | Mobile | Web | Description |
|---------|:------:|:---:|-------------|
| **Dashboard** | ✅ | ✅ | Check-in signals, student roster with status pills, pending session requests |
| **Student Workspace** | ✅ | ✅ | Deep-dive per student: last-7-day mood bars, stress/energy trend charts, journal calendar |
| **Student Profile Modal** | ✅ | ✅ | Comprehensive student analytics in a modal overlay |
| **Session Management** | ✅ | ✅ | Send invites with time slots, track history, record attendance, view session details |
| **Direct Messaging** | ✅ | ✅ | Real-time chat with students (select-student modal, session chat details) |
| **Profile Management** | ✅ | ✅ | Edit counselor profile |
| **Check-In Signals** | ✅ | ✅ | Signal-based student monitoring with configurable thresholds |

### 🛡️ Admin

| Feature | Mobile | Web | Description |
|---------|:------:|:---:|-------------|
| **Dashboard** | ✅ | ✅ | Stat cards, quick action row |
| **Counselor Management** | ✅ | ✅ | View, approve/reject counselor registrations |
| **Student Management** | ✅ | ✅ | View and manage student accounts |
| **Resource Management** | — | ✅ | CRUD operations with detail view |
| **Announcements** | ✅ | ✅ | Create, edit, delete school-wide announcements |
| **Analytics** | ✅ | ✅ | System-wide mood and usage analytics |
| **Audit Logs** | ✅ | ✅ | Timestamped activity log with filterable entries |
| **Platform Settings** | — | ✅ | System configuration |

---

## 🛠️ Tech Stack

### Mobile App (`/mobile`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React Native (Expo) | RN 0.81 · Expo SDK 54 |
| Language | TypeScript (strict) | 5.9 |
| Styling | NativeWind (Tailwind for RN) | NativeWind 4 · Tailwind 3.4 |
| Navigation | Expo Router | 6.0 |
| State Management | Zustand + React Context | Zustand 5 |
| Animations | React Native Reanimated | 4.1 |
| Icons | Lucide React Native | 0.564 |
| Fonts | Nunito Sans (Google Fonts) | — |
| Camera | Expo Camera | 17.0 |
| Audio | Expo AV | 16.0 |
| Notifications | Expo Notifications | 0.32 |
| Haptics | Expo Haptics | 15.0 |
| Auth | Firebase Auth + Google Sign-In | Firebase 12.9 |
| Carousel | React Native Reanimated Carousel | 4.0 |

### Web Dashboard (`/src`)

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React + Vite | React 19 · Vite 7.3 |
| Language | TypeScript (strict) | 5.9 |
| Styling | Tailwind CSS (via @tailwindcss/vite) | 4.1 |
| Navigation | React Router DOM | 7.13 |
| Icons | Lucide React | 0.563 |
| Auth | Firebase Auth | Firebase 12.9 |
| Linting | ESLint + typescript-eslint | ESLint 9 |

### Backend & Infrastructure

| Category | Technology | Details |
|----------|-----------|---------|
| Authentication | Firebase Auth | Email/password + Google Sign-In |
| Database | Cloud Firestore | V2 schema: `moodLogs/{userId}/entries/{docId}` |
| File Storage | Firebase Storage | Profile photos, resources |
| Cloud Functions | Firebase Functions v2 | Node 20 runtime |
| AI Summaries | OpenRouter API | Default model: `openai/gpt-4o-mini` |
| Emotion Detection | Hugging Face Spaces | External facial analysis API |
| Push Notifications | Expo Push | Session invite delivery via Cloud Function |
| CI/CD | GitHub Actions | 4 workflows (CI, CI Web, Deploy Rules, EAS Build) |
| Mobile Builds | EAS Build | Preview (APK), Production (AAB), Development |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │  Mobile (Expo/RN)   │    │  Web Dashboard (Vite/React)│  │
│  │  Student/Counselor/  │    │  Student/Counselor/Admin   │  │
│  │  Admin roles         │    │  Role-based layouts        │  │
│  └──────────┬──────────┘    └─────────────┬──────────────┘  │
└─────────────┼─────────────────────────────┼─────────────────┘
              │                             │
              ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Platform                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Auth   │  │  Firestore   │  │   Cloud Functions v2  │  │
│  │ Email +  │  │  V2 Schema   │  │ • migrateOldMoodLogs  │  │
│  │ Google   │  │  Real-time   │  │ • generateWeeklySumm… │  │
│  └──────────┘  └──────────────┘  │ • deliverSessionExpo… │  │
│  ┌──────────┐                    └───────────────────────┘  │
│  │ Storage  │                                               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
              │                             │
              ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  Hugging Face Spaces │    │  OpenRouter API (GPT-4o-mini)│
│  Emotion Detection   │    │  Weekly AI Summaries         │
└──────────────────────┘    └──────────────────────────────┘
```

**Key Patterns:**
- **Role-based routing**: Separate layout shells per role (`StudentLayout`, `CounselorLayout`, `AdminLayout` on web; `(student)`, `(counselor)`, `(admin)` route groups on mobile)
- **Service layer**: Web services organized by domain under `src/services/{feature}/` with HTTP-method subfolders (`get/`, `post/`, `put/`)
- **Firestore V2 schema**: Mood data stored as `moodLogs/{userId}/entries/{docId}` with `dayKey` indexing
- **Optimistic UI updates**: Mutations update UI immediately, rolling back on failure
- **Shared Firebase project**: Both platforms connect to the same Firebase project (`aurora-44941`)

---

## 🗂️ Project Structure

```
Aurora-capstone/
├── mobile/                          # 📱 React Native App (Expo)
│   ├── app/                         # Expo Router file-based routing
│   │   ├── (student)/               #   Student tab routes
│   │   ├── (counselor)/             #   Counselor tab routes
│   │   ├── (admin)/                 #   Admin tab routes
│   │   ├── (auth)/                  #   Auth screens
│   │   ├── dashboard/               #   Shared dashboard screens
│   │   └── _layout.tsx              #   Root layout
│   ├── src/
│   │   ├── assets/                  #   Images, icons, logos, sounds
│   │   ├── components/              #   UI components
│   │   │   ├── admin/               #     Admin (stat cards, audit log items)
│   │   │   ├── analytics/           #     Mood widgets, descriptive charts
│   │   │   ├── announcements/       #     Carousel, modals, section
│   │   │   ├── auth/                #     Auth-related components
│   │   │   ├── breathing/           #     BreathingCircle, BreathingContainer
│   │   │   ├── common/              #     Shared UI (Button, Card, Input, Avatar, Modal…)
│   │   │   ├── counselor/           #     Session cards, student modals, charts
│   │   │   ├── dashboard/           #     DashboardHeader
│   │   │   ├── navigation/          #     AnimatedTabBarButton, SwipeableTabs
│   │   │   ├── student/             #     Session request cards, streak counter
│   │   │   └── tours/               #     SpotlightTourOverlay
│   │   ├── constants/               #   Colors, moods, roles, routes, thresholds
│   │   ├── features/                #   Feature modules (breathing data)
│   │   ├── firebase/                #   Firebase SDK init (auth, firestore, storage, messaging)
│   │   ├── hooks/                   #   Custom hooks (useAuth, useMoodLogs, useStreak…)
│   │   ├── pages/                   #   Full-screen page components
│   │   │   ├── admin/               #     Analytics, Counselors, Students screens
│   │   │   ├── counselor/           #     CounselorStudentDetailScreen
│   │   │   ├── dashboard/           #     Dashboard tab screens (Mood, Calendar, Analytics…)
│   │   │   └── student/             #     History, Messages, Profile, Resources, MoodLog
│   │   ├── services/                #   36 service files (Firebase, mood, messaging…)
│   │   ├── stores/                  #   Zustand stores (auth, mood, messages, notifications)
│   │   ├── types/                   #   TypeScript interfaces
│   │   └── utils/                   #   Helpers (moodColors, dateHelpers, sessionScheduling…)
│   ├── app.json                     # Expo config
│   ├── eas.json                     # EAS Build profiles
│   ├── firestore.rules              # Firestore security rules
│   ├── storage.rules                # Storage security rules
│   └── package.json
│
├── src/                             # 💻 React Web Dashboard
│   ├── components/                  # UI components
│   │   ├── admin/                   #   StatCard, StatusBadge
│   │   ├── announcements/           #   Banner, cards, form/detail modals
│   │   ├── counselor/               #   Mood bars, session panes, modals
│   │   ├── journal/                 #   AnalyticsTab, JournalCalendar, MoodLogEntry
│   │   ├── messages/                #   ChatBubble, ContactRow, DirectMessageView
│   │   ├── mood-checkin/            #   Wizard steps (Mood, Vitals, Context, Summary)
│   │   ├── profile/                 #   InfoRow, SectionHeader, SettingsRow
│   │   ├── sessions/                #   SessionCard, request/detail modals
│   │   ├── student/                 #   BreathingExercise, MoodIcon, QuickResetBreathing
│   │   ├── EmotionDetection.tsx     #   Webcam emotion analysis
│   │   ├── LetterAvatar.tsx
│   │   └── LoadingScreen.tsx
│   ├── config/                      # Firebase config
│   ├── constants/                   # Mood constants, analytics prompts
│   ├── contexts/                    # AuthContext, UserDaySettingsContext
│   ├── hooks/                       # useMoodCheckIn, useJournalAnalytics, useCounselorNotes…
│   ├── layouts/                     # StudentLayout, CounselorLayout, AdminLayout
│   ├── pages/
│   │   ├── admin/                   #   Dashboard, Counselors, Students, Resources,
│   │   │                            #   Announcements, Analytics, AuditLogs, Settings
│   │   ├── counselor/               #   Students, StudentDetail, Messages, SessionHistory,
│   │   │                            #   StudentWorkspace, Profile
│   │   ├── student/                 #   Journal, Messages, Profile, Resources
│   │   ├── Login.tsx
│   │   ├── ForgotPassword.tsx
│   │   ├── StudentDashboard.tsx
│   │   ├── CounselorDashboard.tsx
│   │   ├── PendingCounselor.tsx
│   │   └── Settings.tsx
│   ├── services/                    # 19 service modules (domain-organized)
│   │   ├── admin/                   ├── counselor/
│   │   ├── announcements/           ├── audit-logs/
│   │   ├── counselor-checkin-context/├── counselor-notes/
│   │   ├── firebase-auth/           ├── firebase-firestore/
│   │   ├── firebase-storage/        ├── messages/
│   │   ├── mood/                    ├── notification/
│   │   ├── presence/                ├── resources/
│   │   ├── schedule/                ├── sessions/
│   │   ├── user-settings/           └── zen-sounds/
│   ├── types/                       # TypeScript interfaces (10 type files)
│   └── utils/                       # Helpers (moodColors, emotions, formatters, analytics)
│
├── functions/                       # ☁️ Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts                 #   migrateOldMoodLogs, generateWeeklySummaryAi
│   │   └── deliverSessionExpoPush.ts#   Push notification delivery
│   ├── package.json                 #   Node 20 engine
│   └── tsconfig.json
│
├── public/                          # 🌐 Static assets (web)
│   ├── images/                      #   Logos, brand kit, mood icons
│   ├── sounds/                      #   Zen audio (6 tracks + breathing sounds)
│   └── favicon.png
│
├── .github/workflows/               # ⚙️ CI/CD
│   ├── ci.yml                       #   Mobile typecheck, Functions build, Rules dry-run
│   ├── ci-web.yml                   #   Web lint + typecheck + build
│   ├── deploy-rules.yml             #   Auto-deploy Firestore/Storage rules on release
│   └── build-android.yml            #   EAS Android cloud build
│
├── .env.example                     # Web environment template
├── firebase.json                    # Firebase project config
├── vite.config.ts                   # Vite dev server config
├── eslint.config.js                 # ESLint flat config
├── tsconfig.json                    # Root TypeScript config
├── tsconfig.app.json                # Web app TypeScript config
├── CODING_STANDARDS.md              # Project coding conventions
├── ASSETS_GUIDE.md                  # Asset management guide
└── package.json                     # Web dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 (required by Cloud Functions)
- **npm** (comes with Node)
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for builds): `npm install -g eas-cli`
- A **Firebase project** with Auth, Firestore, and Storage enabled

### 1. Clone the Repository

```bash
git clone https://github.com/veegestable/Aurora-capstone.git
cd Aurora-capstone
```

### 2. Install Dependencies

```bash
# Web dashboard
npm install

# Mobile app
cd mobile
npm install

# Cloud Functions
cd ../functions
npm install
```

### 3. Configure Environment Variables

Copy the example files and fill in your Firebase credentials:

```bash
# Web (root)
cp .env.example .env

# Mobile
cp mobile/.env.example mobile/.env
```

### 4. Run the Applications

**Web Dashboard:**
```bash
npm run dev
# → http://localhost:5173
```

**Mobile App:**
```bash
cd mobile
npx expo start -c
# Scan QR with Expo Go (Android/iOS) or run on emulator
```

**Cloud Functions (local emulator):**
```bash
cd functions
npm run serve
```

> **Note**: Camera/emotion detection features require a physical device or an emulator with camera support.

---

## 🌐 Environment Variables

### Web Dashboard (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |
| `VITE_EMOTION_API_URL` | Hugging Face Spaces emotion detection endpoint |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key for AI weekly summaries |
| `VITE_APP_NAME` | Application display name |

### Mobile App (`mobile/.env`)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL (for presence) |
| `EXPO_PUBLIC_EMOTION_API_URL` | Hugging Face Spaces emotion detection endpoint |
| `EXPO_PUBLIC_APP_NAME` | Application display name |

> Mobile uses the `EXPO_PUBLIC_` prefix to expose variables inside the Expo app at runtime.

### Cloud Functions (runtime config)

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI weekly summaries |
| `OPENROUTER_MODEL` | LLM model identifier (default: `openai/gpt-4o-mini`) |

---

## 🤖 Continuous Integration / Delivery

### Branch Model

| Branch | Role | Push Policy |
|--------|------|-------------|
| **`main`** | Day-to-day work. CI runs on every push (informational green/red). | Push freely. |
| **`release`** | Trusted line used for demos, store builds, and live rules deploys. | Update via PR `main` → `release` only. CI must be green to merge (after branch protection is enabled). |

**Promotion flow:** develop on `main` → when a snapshot is ready, open a PR `main → release` → wait for CI green → merge. Anything that touches `mobile/firestore.rules` or `mobile/storage.rules` then auto-deploys to Firebase.

### `CI` — `.github/workflows/ci.yml`

Runs on every PR into `main` or `release`, and on direct pushes to either:

- **Mobile typecheck** — `tsc --noEmit` inside `mobile/`
- **Cloud Functions build** — `npm run build` inside `functions/`
- **Firestore + Storage rules dry-run** — `firebase deploy --dry-run` validates that `mobile/firestore.rules` and `mobile/storage.rules` compile against the live Firebase parser. Skipped automatically on forks (or any run without the credentials secret).

### `CI Web` — `.github/workflows/ci-web.yml`

Runs **only when web-related paths change** (`src/`, `public/`, root `package.json`, Vite/ESLint/Tailwind configs, etc.). Keeps the Vite dashboard healthy without blocking mobile-only work.

### `Deploy Firestore + Storage Rules` — `.github/workflows/deploy-rules.yml`

Runs on push to **`release`** whenever any of these change:
`mobile/firestore.rules`, `mobile/storage.rules`, `mobile/firebase.json`, `mobile/.firebaserc`.

Publishes the rules to Firebase project `aurora-44941` automatically.

### `Build Android (EAS)` — `.github/workflows/build-android.yml`

Triggers an EAS cloud build for Android whenever **`release`** changes inside `mobile/`.

- **Auto-trigger:** `push` to `release` with changes under `mobile/**`
- **Manual:** Actions tab → **Build Android (EAS)** → **Run workflow** → pick `preview` (APK), `production` (AAB), or `development`
- **Build profiles** (defined in `mobile/eas.json`):
  - `preview` → installable `.apk`, internal distribution
  - `production` → `.aab` for Play Store, auto-increments `versionCode`
  - `development` → dev client build for hot-reload native testing

### Recommended Branch Protection

GitHub repo → **Settings → Branches → Add branch protection rule** for `release`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- ✅ Required jobs: `Mobile (Expo) typecheck`, `Cloud Functions typecheck/build`, `Firestore + Storage rules compile`
- ⛔ **Do not** require `Web (Vite) lint + typecheck + build` if you want mobile releases independent of the web dashboard
- ✅ Require branches to be up to date before merging

### One-Time Setup: Firebase Credential Secret

In **Settings → Secrets and variables → Actions → New repository secret**:

**Option 1 — Service account (recommended)**
1. Firebase Console → ⚙️ Project Settings → **Service accounts** → **Generate new private key**
2. Copy the downloaded JSON file's full contents
3. Add a secret named `FIREBASE_SERVICE_ACCOUNT`

**Option 2 — CI token (legacy)**
1. Run: `npx firebase-tools login:ci`
2. Add a secret named `FIREBASE_TOKEN` with the printed token

### One-Time Setup: EAS Builds

```bash
npm install -g eas-cli
eas login
cd mobile
eas init    # creates extra.eas.projectId in app.json
```

Then add an **`EXPO_TOKEN`** secret (generate at [expo.dev/settings/access-tokens](https://expo.dev/accounts/settings/access-tokens)).

### Manual Builds (Optional)

```bash
cd mobile
npx eas build --platform android --profile preview      # installable APK
npx eas build --platform android --profile production   # Play Store AAB
npx eas build --platform ios --profile production       # IPA (requires Apple Dev account)
```

---

## 📸 Screenshots

<!-- TODO: Add screenshots here -->
*Screenshots coming soon.*

---

## 👥 Authors

| Name | Role |
|------|------|
| **Crislane Josh B. Eugenio** | Developer |
| **Mary Antonette R. Garcia** | Researcher |
| **Veejay B. Viovicente** | Developer |

---

## 🙏 Acknowledgments

- **Mindanao State University – Iligan Institute of Technology (MSU-IIT)** — Capstone project
- [Firebase](https://firebase.google.com/) — Backend infrastructure
- [Expo](https://expo.dev/) — Mobile development platform
- [OpenRouter](https://openrouter.ai/) — AI model routing for weekly summaries
- [Hugging Face](https://huggingface.co/) — Emotion detection model hosting

---

**Aurora** — Illuminating the path to mental wellness 🌅✨
