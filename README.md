# Aurora Mental Health Tracking App 🌅

Aurora is a comprehensive mental health tracking application designed to help students monitor their emotional well-being and connect with counselors for support.

## 🎯 Features

### For Students
- **Mood Check-in**: Daily emotional state tracking with multiple emotion detection
- **Mood Calendar**: Visual representation of mood patterns over time
- **Analytics**: Insights into emotional trends and patterns
- **Schedule Management**: Track academic deadlines and events
- **Notifications**: Reminders for mood check-ins and important events

### For Counselors
- **Student Dashboard**: Overview of all assigned students
- **Analytics**: Aggregate mood data and trends
- **Communication**: Direct messaging with students
- **Report Generation**: Detailed mental health reports

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling with Aurora brand system
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Firebase** for authentication and database
- **Firestore** for real-time data storage
- **Firebase Auth** for user management

### Database
- **Firebase Firestore** (Cloud-hosted NoSQL database)
- **Real-time data synchronization**
- **Scalable and secure**

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aurora-mental-health.git
   cd aurora-mental-health
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Copy environment file
   cp .env.example .env
   ```
   
   Edit `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

6. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📱 Aurora Design System

Aurora uses a custom design system with:
- **Primary Colors**: Deep navy (#010632) and aurora blue (#3257FE)
- **Secondary Colors**: Success green (#5ABA1C) and accent blue
- **Emotion Colors**: Specific colors for each emotion (joy, calm, anger, etc.)
- **Responsive Design**: Mobile-first with desktop sidebar and mobile bottom navigation

## 🗂️ Project Structure

```
Aurora1/
├── src/                    # Frontend React app
│   ├── components/         # Reusable UI components
│   ├── pages/             # Main application pages
│   ├── services/          # Firebase service functions
│   ├── contexts/          # React context providers
│   ├── config/            # Firebase configuration
│   └── utils/             # Helper utilities
├── public/                # Static assets
└── docs/                  # Documentation files
```

## 🔧 Development Commands

```bash
# Frontend development
npm run dev                 # Start Vite dev server
npm run build              # Build for production
npm run preview           # Preview production build

# Code quality
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking
```

## 🌐 Production Deployment

### Firebase Setup for Production
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication and Firestore Database
3. Set up Firestore security rules for your application
4. Deploy using Firebase Hosting or your preferred hosting service
5. Update environment variables in your deployment platform:
   ```env
   VITE_FIREBASE_API_KEY=your_production_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

## 📊 Firestore Database Structure

### Users Collection
```typescript
{
  uid: string,
  email: string,
  fullName: string,
  role: 'student' | 'counselor',
  avatarUrl?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### MoodLogs Collection
```typescript
{
  id: string,
  userId: string,
  emotions: [{
    emotion: string,
    confidence: number,
    color: string
  }],
  notes?: string,
  logDate: Timestamp,
  energyLevel: number,
  stressLevel: number,
  detectionMethod: 'manual' | 'ai',
  createdAt: Timestamp
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Documentation](./docs/)
- Open an issue on GitHub
- Contact the development team

## 🙏 Acknowledgments

- Built with ❤️ for mental health awareness
- Icons by [Lucide](https://lucide.dev/)
- Styling powered by [TailwindCSS](https://tailwindcss.com/)
- Database by [MongoDB](https://mongodb.com/)

---

**Aurora** - Illuminating the path to mental wellness 🌅✨