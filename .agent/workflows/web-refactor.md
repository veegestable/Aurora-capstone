---
description: Workflow for translating mobile screens to web pages while keeping the web tech stack and Aurora branding.
---

# Web UI Refactor — Mobile-to-Web Page Translation

This workflow guides the translation of mobile (Expo/React Native) screens into web (Vite/React) pages. Use it as a reference for each page you implement.

---

## 1. Tech Stack Reference

Keep the **web stack**. Do NOT introduce mobile-only packages.

| Layer         | Web (Keep)                                   | Mobile (Reference Only)                        |
|---------------|----------------------------------------------|------------------------------------------------|
| Framework     | Vite + React 19                              | Expo SDK 54 + React Native 0.81                |
| Routing       | `react-router-dom` v7 (`<Routes>`, `<Route>`)| `expo-router` (file-based)                     |
| Styling       | Tailwind CSS **v4** (CSS-first config)       | NativeWind + Tailwind v3 (JS config)           |
| Icons         | `lucide-react`                               | `lucide-react-native`                          |
| State (local) | `useState` / `useReducer`                    | `useState` / `useReducer`                      |
| State (global)| React Context (`AuthContext`)                | Zustand stores                                 |
| Backend       | Firebase (shared `firebase` v12.9)           | Firebase (shared `firebase` v12.9)             |
| Fonts         | Buenos Aires, Euclid Circular A, Inter       | System defaults                                |

### Key Translation Rules

- **`View` → `<div>`**, **`Text` → `<span>` / `<p>` / `<h*>`**, **`TouchableOpacity` / `Pressable` → `<button>`**
- **`ScrollView` → native scrolling** (remove wrapper, use `overflow-y-auto` if needed)
- **`FlatList` → `array.map()`** with proper `key` props
- **`StyleSheet.create({})` → Tailwind utility classes**
- **NativeWind classes (`className` on RN)** → usually the same Tailwind classes, but verify against v4 syntax
- **`expo-linear-gradient` → CSS `background: linear-gradient(...)`**
- **`expo-haptics` → omit** (no web equivalent needed)
- **`react-native-reanimated` → CSS transitions/animations** or existing Aurora animations from `index.css`
- **`Ionicons` / `@expo/vector-icons` → `lucide-react`** equivalent icons
- **Zustand stores → React Context** or local state (match existing web patterns)
- **`expo-image-picker` → `<input type="file" accept="image/*">`**

---

## 2. Branding & Design System

All new pages MUST use the tokens and utilities already defined in `src/index.css`. Do NOT create ad-hoc colors or shadows.

### Color Tokens (from `src/index.css` `@theme` block)

| Token                              | Hex       | Usage                        |
|------------------------------------|-----------|------------------------------|
| `aurora-primary-dark`              | `#010632` | Primary text, dark backgrounds|
| `aurora-primary-light`             | `#E4E3DF` | Light backgrounds            |
| `aurora-blue-main` / `blue-500`    | `#4A90E2` | Primary interactive elements |
| `aurora-secondary-blue`            | `#3257FE` | Buttons, links, accents      |
| `aurora-secondary-green`           | `#5ABA1C` | Success states, CTA gradients|
| `aurora-secondary-dark-blue`       | `#00136F` | Hover states (dark blue)     |
| `aurora-secondary-dark-green`      | `#00713B` | Hover states (dark green)    |
| Emotion colors: `joy`, `sadness`, `fear`, `disgust`, `anger`, `love`, `surprise`, `neutral` | — | Mood-related UI |
| Blue scale `blue-50` → `blue-900`  | —         | Backgrounds, borders, shading|
| Gray scale `gray-50` → `gray-900`  | —         | Text hierarchy, dividers     |

### Pre-built Utilities (use these first)

| Utility Class              | Purpose                                  |
|----------------------------|------------------------------------------|
| `btn-aurora`               | Primary gradient button                  |
| `btn-aurora-secondary`     | Secondary green gradient button          |
| `btn-aurora-outline`       | Outlined button style                    |
| `card-aurora`              | White card with blur + shadow            |
| `gradient-aurora`          | Blue-to-dark gradient background         |
| `gradient-aurora-light`    | Light gradient background                |
| `text-gradient-aurora`     | Gradient text effect                     |
| `text-aurora-subtitle`     | Styled subtitle text                     |
| `font-primary`             | Heading font family                      |
| `animate-aurora-glow`      | Glowing pulse animation                  |
| `animate-aurora-float`     | Floating animation                       |
| `animate-aurora-pulse-gradient` | Background gradient pulse           |

### Fonts

- **Headings**: `font-heading` → Buenos Aires Bold
- **Body**: `font-body` → Euclid Circular A
- **Accent/Fallback**: `font-accent` → Inter (loaded via Google Fonts)

---

## 3. Pages to Translate

Below is the full list of mobile screens grouped by role. Each entry shows the mobile source file and suggested web target path.

### 3.1 Authentication (Shared)

| Mobile Source | Web Target | Status |
|---|---|---|
| `app/(auth)/login.tsx` → `src/pages/LoginScreen.tsx` | `src/pages/Login.tsx` | ✅ Already exists |
| `app/(auth)/forgot-password.tsx` | `src/pages/ForgotPassword.tsx` | ❌ Needs creation |

---

### 3.2 Student Role

| # | Mobile Source (`src/pages/student/` or `app/(student)/`) | Web Target | Priority | Notes |
|---|---|---|---|---|
| 1 | `index.tsx` → `MoodLogScreen.tsx` + `MoodCheckIn` component | `src/pages/StudentDashboard.tsx` | — | ✅ Already exists (refactor as needed) |
| 2 | `history.tsx` → `HistoryScreen.tsx` (~17KB) | `src/pages/student/History.tsx` | High | Mood log history with charts |
| 3 | `messages.tsx` → `MessagesScreen.tsx` (~33KB) | `src/pages/student/Messages.tsx` | High | Chat/messaging with counselor |
| 4 | `profile.tsx` → `ProfileScreen.tsx` (~21KB) | `src/pages/student/Profile.tsx` | Medium | Profile settings and info |
| 5 | `resources.tsx` → `ResourcesScreen.tsx` (~22KB) | `src/pages/student/Resources.tsx` | Medium | Mental health resources |

---

### 3.3 Counselor Role

| # | Mobile Source (`app/(counselor)/`) | Web Target | Priority | Notes |
|---|---|---|---|---|
| 1 | `index.tsx` (~18KB) | `src/pages/CounselorDashboard.tsx` | — | ✅ Already exists (refactor as needed) |
| 2 | `messages.tsx` (~33KB) | `src/pages/counselor/Messages.tsx` | High | Messaging with students |
| 3 | `risk-center.tsx` (~26KB) | `src/pages/counselor/RiskCenter.tsx` | High | At-risk student dashboard |
| 4 | `students/index.tsx` (~18KB) | `src/pages/counselor/Students.tsx` | High | Student list |
| 5 | `students/[id]/index.tsx` | `src/pages/counselor/StudentDetail.tsx` | High | Individual student view |
| 6 | `students/[id]/messages.tsx` | Part of `StudentDetail.tsx` (tab) | Medium | Student-specific messages |
| 7 | `students/[id]/notes.tsx` | Part of `StudentDetail.tsx` (tab) | Medium | Counselor notes on student |
| 8 | `profile.tsx` (~23KB) | `src/pages/counselor/Profile.tsx` | Medium | Counselor profile |
| 9 | `reminders.tsx` (placeholder) | `src/pages/counselor/Reminders.tsx` | Low | Placeholder in mobile |
| 10 | `reports.tsx` (placeholder) | `src/pages/counselor/Reports.tsx` | Low | Placeholder in mobile |

---

### 3.4 Admin Role

| # | Mobile Source (`app/(admin)/`) | Web Target | Priority | Notes |
|---|---|---|---|---|
| 1 | `index.tsx` (~2KB) | `src/pages/admin/Dashboard.tsx` | Medium | Admin overview |
| 2 | `analytics.tsx` (placeholder) | `src/pages/admin/Analytics.tsx` | Low | Analytics dashboard |
| 3 | `announcements.tsx` (placeholder) | `src/pages/admin/Announcements.tsx` | Medium | Announcement management |
| 4 | `counselors/index.tsx` → `AdminCounselorsScreen.tsx` (~11KB) | `src/pages/admin/Counselors.tsx` | Medium | Counselor management |
| 5 | `counselors/[id].tsx` | `src/pages/admin/CounselorDetail.tsx` | Low | Counselor detail view |
| 6 | `students/index.tsx` | `src/pages/admin/Students.tsx` | Medium | Student management |
| 7 | `students/[id].tsx` | `src/pages/admin/StudentDetail.tsx` | Low | Student detail view |
| 8 | `resources/index.tsx` | `src/pages/admin/Resources.tsx` | Medium | Resource management |
| 9 | `resources/[id].tsx` | `src/pages/admin/ResourceDetail.tsx` | Low | Resource detail |
| 10 | `audit-logs.tsx` (placeholder) | `src/pages/admin/AuditLogs.tsx` | Low | Audit log viewer |
| 11 | `settings.tsx` (placeholder) | `src/pages/admin/Settings.tsx` | Low | Admin settings |

---

### 3.5 Shared / Dashboard

| # | Mobile Source | Web Target | Priority | Notes |
|---|---|---|---|---|
| 1 | `app/pending-counselor.tsx` | `src/pages/PendingCounselor.tsx` | Medium | Pending approval screen |
| 2 | `src/pages/dashboard/SettingsScreen.tsx` (~5KB) | `src/pages/Settings.tsx` | Medium | Global settings |

---

## 4. Existing Web Components (Reuse These)

These components already exist in `src/components/` and should be **reused and extended**, not rewritten:

| Component | File | Size | Used In |
|---|---|---|---|
| `MoodCheckIn` | `MoodCheckIn.tsx` | ~15KB | StudentDashboard |
| `MoodCalendar` | `MoodCalendar.tsx` | ~12KB | StudentDashboard |
| `Analytics` | `Analytics.tsx` | ~10KB | StudentDashboard |
| `ScheduleManager` | `ScheduleManager.tsx` | ~9KB | CounselorDashboard |
| `EmotionDetection` | `EmotionDetection.tsx` | ~11KB | StudentDashboard |
| `NotificationPanel` | `NotificationPanel.tsx` | ~8KB | CounselorDashboard |

---

## 5. Per-Page Implementation Checklist

Use this checklist for **each page** you translate:

```markdown
- [ ] **Identify mobile source** — Open the mobile screen file and understand its layout, state, and API calls
- [ ] **Create web file** — Create the `.tsx` file in the correct `src/pages/` subdirectory
- [ ] **Translate JSX** — Convert RN components to HTML elements (View→div, Text→span/p, etc.)
- [ ] **Convert styles** — Replace NativeWind/StyleSheet with Tailwind v4 utility classes using Aurora tokens
- [ ] **Replace icons** — Swap `lucide-react-native` / `@expo/vector-icons` → `lucide-react`
- [ ] **Adapt navigation** — Replace `router.push()` / `<Link>` (expo) → `useNavigate()` / `<Link>` (react-router-dom)
- [ ] **Migrate state** — Replace Zustand stores with Context or local state as appropriate
- [ ] **Reuse services** — Check if the Firebase service already exists in web `src/services/`; if not, port it
- [ ] **Reuse types** — Check if types exist in web `src/types/`; if not, port from mobile `src/types/`
- [ ] **Wire up routing** — Add `<Route>` entry in `App.tsx`
- [ ] **Responsive design** — Ensure the page works at mobile, tablet, and desktop breakpoints
- [ ] **Apply Aurora branding** — Use `card-aurora`, `btn-aurora`, Aurora color tokens, font variables
- [ ] **Accessibility** — Add `aria-label` to interactive elements
- [ ] **Test** — Verify the page renders correctly and data loads from Firebase
```

---

## 6. Routing Setup

The current web routing in `App.tsx` is minimal. As pages are added, evolve it like this:

```
/                     → Role-based redirect (Student/Counselor/Admin Dashboard)
/forgot-password      → ForgotPassword page
/student/history      → Student History
/student/messages     → Student Messages
/student/profile      → Student Profile
/student/resources    → Student Resources
/counselor/messages   → Counselor Messages
/counselor/risk-center → Risk Center
/counselor/students   → Student List
/counselor/students/:id → Student Detail (with tabs for messages/notes)
/counselor/profile    → Counselor Profile
/admin/               → Admin Dashboard
/admin/counselors     → Counselor Management
/admin/students       → Student Management
/admin/resources      → Resource Management
/admin/announcements  → Announcements
/admin/analytics      → Analytics
/admin/audit-logs     → Audit Logs
/admin/settings       → Admin Settings
/settings             → Global Settings
/pending-counselor    → Pending Approval
```

---

## 7. Suggested Implementation Order

Work through pages in this priority order to get the most value first:

### Phase 1: Core Student Experience
1. Refactor `StudentDashboard.tsx` (clean up existing)
2. `student/History.tsx`
3. `student/Messages.tsx`

### Phase 2: Core Counselor Experience
4. Refactor `CounselorDashboard.tsx` (clean up existing)
5. `counselor/RiskCenter.tsx`
6. `counselor/Students.tsx` + `counselor/StudentDetail.tsx`
7. `counselor/Messages.tsx`

### Phase 3: Profiles & Shared
8. `student/Profile.tsx`
9. `counselor/Profile.tsx`
10. `student/Resources.tsx`
11. `ForgotPassword.tsx`
12. `PendingCounselor.tsx`
13. `Settings.tsx`

### Phase 4: Admin Module
14. `admin/Dashboard.tsx`
15. `admin/Counselors.tsx`
16. `admin/Students.tsx`
17. `admin/Resources.tsx`
18. `admin/Announcements.tsx`
19. Remaining admin pages (Analytics, AuditLogs, Settings, detail pages)

---

## 8. Services & Types to Port

When translating a page, check these mobile directories for services/types that don't yet exist on web.

> **⚠️ MANDATORY: Web Services Folder Structure**
>
> Every web service **MUST** follow the established folder convention. Do NOT create flat service files or barrel exports that re-export from external paths.
>
> **Structure:** `services/{feature}/{http_method}/individual_file.ts`
>
> ```
> src/services/{feature}/
>   ├── get/
>   │   ├── getSomething.ts       ← one function per file
>   │   └── listSomethings.ts
>   ├── post/
>   │   └── createSomething.ts
>   ├── put/
>   │   └── updateSomething.ts
>   ├── delete/
>   │   └── deleteSomething.ts
>   └── index.ts                  ← barrel: imports all, exports ONE service object
>   └── types.ts
> ```
>
> **Barrel `index.ts` pattern** (import → single named export):
> ```typescript
> import { getSomething } from './get/getSomething'
> import { createSomething } from './post/createSomething'
>
> export const somethingService = {
>   getSomething,
>   createSomething,
> }
> ```
>
> **Rules:**
> 1. Each file exports exactly **one function**.
> 2. The barrel `index.ts` imports from local `./get/`, `./post/`, etc. — never from external paths.
> 3. The barrel exports a **single const service object** (e.g., `export const moodService = { ... }`).
> 4. Consumers import the service object: `import { moodService } from '../services/mood'`.
> 5. For operations that don't map to HTTP methods (e.g., real-time listeners), use `get/` as the directory.

### Services (mobile `src/services/` → web `src/services/`)
- `messages.service.ts` → `src/services/messages/`
- `resources.service.ts` → `src/services/resources/`
- `risk-flags.service.ts` → `src/services/risk-flags/`
- `students.service.ts` → `src/services/students/`
- `counselors.service.ts` → `src/services/counselors/`
- `reports.service.ts` → `src/services/reports/`
- `announcements.service.ts` → `src/services/announcements/`
- `audit-logs.service.ts` → `src/services/audit-logs/`
- `counselor-notes.service.ts` → `src/services/counselor-notes/`
- `zen-sounds.service.ts` → `src/services/zen-sounds/` (if needed)

### Types (mobile `src/types/` → web `src/types/`)
- `user.types.ts`
- `student.types.ts`
- `counselor.types.ts`
- `message.types.ts`
- `resource.types.ts`
- `risk.types.ts`
- `audit.types.ts`

> **Note**: The web already has `mood.types.ts`. Check for conflicts before porting.

---

## 9. Common Pitfalls

- **Tailwind v3 vs v4**: Mobile uses v3 JS config. Web uses v4 CSS-first config (`@theme` block in `index.css`). Do NOT copy `tailwind.config.js` patterns to web.
- **Color mismatches**: Mobile's Aurora palette keys differ slightly from web (e.g., mobile `aurora-bg: #0B0D30` vs web `aurora-primary-dark: #010632`). Always prefer the web token.
- **`nativewind` classes**: Most map 1:1 to standard Tailwind, but verify that class names exist in v4.
- **Animated components**: Replace `Animated.View` / `reanimated` with CSS transitions or the Aurora animations in `index.css`.
- **Platform-specific code**: Remove all `Platform.OS` checks and RN-specific APIs.
- **Navigation params**: Expo Router uses `useLocalSearchParams()`. Web uses `useParams()` / `useSearchParams()` from `react-router-dom`.
