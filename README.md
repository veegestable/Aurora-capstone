# Aurora Mental Health Tracking App 🌅

Aurora is a comprehensive mental health tracking ecosystem designed to help students monitor their emotional well-being and connect with counselors.

> **Project Structure**: This repository is a **Monorepo** containing both the Web Dashboard (React) and Mobile Application (React Native).

## 🎯 Features

### Mobile App (Student Focus)
- **AI Camera**: Emotion detection using facial analysis
- **Mood Check-in**: Daily tracking with intensity sliders
- **Context Tracking**: Academic load, sleep, and stress factors
- **Journal**: Personal reflection notes
- **Visual Analytics**: Weekly and monthly mood charts

### Web Dashboard (Counselor Focus)
- **Student Overview**: Monitor assigned students
- **Risk Alerts**: Auto-flagging of high-stress/low-mood patterns
- **Analytics**: Aggregate data visualization
- **Management**: Student assignment & reporting

---

## 🛠️ Tech Stack

### Mobile App (`/mobile`)
- **Framework**: React Native (Expo)
- **Styling**: NativeWind (TailwindCSS for Native)
- **Camera**: Expo Camera
- **Navigation**: Expo Router
- **Icons**: Ionicons

### Web Dashboard (`/`)
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS
- **Navigation**: React Router

### Backend & Data (Shared)
- **Firebase Auth**: User authentication
- **Firestore**: Real-time NoSQL database
- **Cloud Functions**: Backend logic

---

## 🚀 Getting Started

### 1. Unified Setup (Root)
First, clone the repository:
```bash
git clone https://github.com/yourusername/aurora-mental-health.git
cd aurora-mental-health
```

### 2. Mobile App Setup
Navigate to the mobile directory:
```bash
cd mobile
npm install
```

**Running the Mobile App:**
```bash
npx expo start -c
```
*   Scan the QR code with **Expo Go** (Android/iOS) or run on an Emulator.
*   **Note**: Camera features require a physical device or a configured emulator with camera support.

### 3. Web Dashboard Setup
Navigate to the root directory (if you are in mobile, go back up):
```bash
cd ..
npm install
```

**Running the Web App:**
```bash
npm run dev
```
*   Access at: `http://localhost:5173`

---

## �️ Project Structure

```
Aurora/
├── mobile/                 # 📱 React Native App (Student)
│   ├── app/                # Expo Router screens
│   ├── components/         # Mobile components
│   └── assets/             # Mobile assets
│
├── src/                    # 💻 React Web App (Counselor)
│   ├── components/         # Web components
│   ├── pages/             # Dashboard pages
│   └── services/          # Firebase logic
│
├── public/                # Static assets
└── firebase/              # Firebase config
```

## 🌐 Environment Setup

You need to configure Firebase credentials. Create a `.env` file in **both** the root and `mobile/` directories (using `.env.example` as a template).

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase config
```
*(Note: Mobile uses `EXPO_PUBLIC_` prefix for variables to be exposed in the app)*

---

## 🤖 Continuous Integration / Delivery

### Branch model

| Branch | Role | Push policy |
|--------|------|-------------|
| **`main`** | Day-to-day work. CI runs on every push (informational green/red). | Push freely. |
| **`release`** | Trusted line used for demos, store builds, and live rules deploys. | Update via PR `main` → `release` only. CI must be green to merge (after branch protection is enabled). |

Promotion flow: develop on `main` → when a snapshot is ready, open a PR `main → release` → wait for CI green → merge. Anything that touches `mobile/firestore.rules` or `mobile/storage.rules` then auto-deploys to Firebase.

### `CI` — `.github/workflows/ci.yml`
Runs on every PR into `main` or `release`, and on direct pushes to either:

- **Mobile typecheck** — `tsc --noEmit` inside `mobile/`
- **Web lint + typecheck + build** — `npm run lint && npm run typecheck && npm run build` at the root
- **Cloud Functions build** — `npm run build` inside `functions/`
- **Firestore + Storage rules dry-run** — `firebase deploy --dry-run` validates that `mobile/firestore.rules` and `mobile/storage.rules` compile against the live Firebase parser. Skipped automatically on forks (or any run without the credentials secret).

### `Deploy Firestore + Storage rules` — `.github/workflows/deploy-rules.yml`
Runs on push to **`release`** whenever any of these change:
`mobile/firestore.rules`, `mobile/storage.rules`, `mobile/firebase.json`, `mobile/.firebaserc`.

Publishes the rules to Firebase project `aurora-44941` automatically — no more manual `firebase deploy` from a laptop. Can also be triggered manually from the Actions tab.

### Recommended branch protection
GitHub repo → **Settings → Branches → Add branch protection rule** for `release`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
- ✅ Tick all four CI jobs as required (Mobile, Web, Functions, Rules)
- ✅ Require branches to be up to date before merging

`main` stays unprotected so quick iterative pushes are not slowed down.

### One-time setup: add a Firebase credential secret

Pick **one** of the two below in **Settings → Secrets and variables → Actions → New repository secret**:

**Option 1 — Service account (recommended)**
1. Firebase Console → ⚙️ Project Settings → **Service accounts** → **Generate new private key**.
2. Open the downloaded JSON file, copy its full contents.
3. Add a secret named `FIREBASE_SERVICE_ACCOUNT` with the JSON as its value.

**Option 2 — CI token (legacy, simpler)**
1. On your laptop: `npx firebase-tools login:ci`
2. Copy the printed token.
3. Add a secret named `FIREBASE_TOKEN` with the token as its value.

After saving the secret, the next push to `main` that touches a rules file will deploy automatically.

### Cutting an APK / IPA
Production app binaries are **not** built in CI (Apple Developer Program is paid; EAS credits are limited). Run them locally when you cut a release:

```bash
cd mobile
npx eas build --platform android --profile production   # APK
npx eas build --platform ios --profile production       # IPA (requires Apple Dev account)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Aurora** - Illuminating the path to mental wellness 🌅✨