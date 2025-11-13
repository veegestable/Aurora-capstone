# Aurora Development Quick Start

## Your MongoDB Setup ✅
Great news! Your MongoDB is already running locally. Here's your development workflow:

## Daily Development Commands

### Start Aurora (Full Stack)
```bash
# From project root
npm run dev:all
```

### Or start separately:
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend  
npm run dev
```

### Check MongoDB Status
```bash
cd server
npm run check-mongodb
```

### Test Database Connection
```bash
cd server
npm run test-db
```

## Your Database Info
- **URL**: `mongodb://localhost:27017/aurora`
- **Database**: `aurora` 
- **Collections**: users, moodlogs, schedules, notifications (auto-created)

## View Your Data
**MongoDB Compass** (Recommended GUI):
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select `aurora` database

## Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Your .env should have:
MONGODB_URI=mongodb://localhost:27017/aurora
JWT_SECRET=your_secret_here
PORT=3001
```

## When Ready for Production (MongoDB Atlas)
1. **Get some budget** 💰
2. **Create Atlas account** (free tier available)
3. **Update .env**:
   ```
   MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/aurora
   ```
4. **Migrate data**:
   ```bash
   mongodump --db aurora
   mongorestore --uri "atlas_connection_string" --db aurora
   ```

## Helpful Commands
```bash
# Check if MongoDB is running
Get-Service MongoDB

# Start MongoDB service (if stopped)
net start MongoDB

# Restart MongoDB (if issues)
net stop MongoDB
net start MongoDB
```

## Project Structure
```
Aurora1/
├── server/           # Backend API
├── src/             # Frontend React app
├── server/models/   # Database schemas
└── server/config/   # Database connection
```

## Benefits of Your Current Setup
- ✅ **Free** - No monthly costs
- ✅ **Fast** - Local = no network latency  
- ✅ **Offline** - Works without internet
- ✅ **Full control** - All MongoDB features
- ✅ **Easy testing** - Quick to reset data
- ✅ **Atlas ready** - Easy migration path

Your Aurora mental health app is ready for development! Start building those mood tracking features! 🚀