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