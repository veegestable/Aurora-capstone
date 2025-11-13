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
- **Node.js** with Express.js
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **bcryptjs** for password hashing

### Database
- **MongoDB** (Local development)
- **MongoDB Atlas** ready for production

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB Community Server (for local development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aurora-mental-health.git
   cd aurora-mental-health
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/aurora
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=3001
   NODE_ENV=development
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # Or check if running
   sc query MongoDB
   ```

5. **Run the application**
   ```bash
   # Start both frontend and backend
   npm run dev:all
   
   # Or start separately:
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   npm run server:watch
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
│   ├── services/          # API service functions
│   ├── contexts/          # React context providers
│   └── utils/             # Helper utilities
├── server/                # Backend Express app
│   ├── config/            # Database and app configuration
│   ├── models/            # MongoDB/Mongoose models
│   ├── routes/            # API route handlers
│   ├── middleware/        # Express middleware
│   └── services/          # Business logic services
├── public/                # Static assets
└── docs/                  # Documentation files
```

## 🔧 Development Commands

```bash
# Frontend development
npm run dev                 # Start Vite dev server
npm run build              # Build for production
npm run preview           # Preview production build

# Backend development
npm run server:watch      # Start backend with hot reload
npm run server           # Start backend (production mode)

# Full stack development
npm run dev:all          # Start both frontend and backend

# Database utilities
cd server
npm run check-mongodb    # Check MongoDB connection
npm run test-db         # Test database connection

# Code quality
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking
```

## 🌐 Production Deployment

### MongoDB Atlas Setup
1. Create a MongoDB Atlas account
2. Create a new cluster (free M0 tier available)
3. Get connection string and update `.env`:
   ```env
   MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/aurora
   ```

### Environment Variables
```env
# Production
NODE_ENV=production
MONGODB_ATLAS_URI=your_atlas_connection_string
JWT_SECRET=your_production_secret_key
PORT=3001
```

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  full_name: String,
  role: 'student' | 'counselor',
  avatar_url: String,
  created_at: Date,
  updated_at: Date
}
```

### MoodLogs Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  emotions: [{
    emotion: String,
    confidence: Number,
    color: String
  }],
  notes: String,
  log_date: Date,
  energy_level: Number,
  stress_level: Number,
  detection_method: 'manual' | 'ai',
  created_at: Date
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