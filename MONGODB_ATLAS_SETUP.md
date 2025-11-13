# MongoDB Atlas Setup Guide for Aurora

## Overview
This guide helps you set up MongoDB Atlas for your Aurora mental health tracking application.

## Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create your first cluster (select the free M0 tier)

## Step 2: Create Database User
1. In Atlas dashboard, go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Set user privileges to "Read and write to any database"

## Step 3: Configure Network Access
1. Go to "Network Access" in Atlas dashboard
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your specific IP addresses

## Step 4: Get Connection String
1. Go to "Databases" in Atlas dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

## Step 5: Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Update the `MONGODB_ATLAS_URI` with your connection string:
   ```
   MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/aurora?retryWrites=true&w=majority
   ```
3. Replace `<username>`, `<password>`, and `cluster0.xxxxx` with your actual values

## Step 6: Database Collections
Aurora will automatically create these collections:
- `users` - User accounts and profiles
- `moodlogs` - Mood tracking entries with emotions and selfies
- `schedules` - Academic events and deadlines
- `notifications` - System notifications and reminders

## Step 7: Production Deployment
For production deployment:
1. Use a dedicated database user for the application
2. Restrict network access to your production server IPs
3. Enable MongoDB Atlas monitoring and alerts
4. Consider upgrading to a paid tier for better performance

## Environment Variables Reference
```env
# Development
MONGODB_URI=mongodb://localhost:27017/aurora

# Production (Atlas)
MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aurora?retryWrites=true&w=majority

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d
```

## Benefits of MongoDB for Aurora
- **Flexible Schema**: Perfect for mood data with varying emotion arrays
- **JSON-like Documents**: Natural fit for React/TypeScript frontend
- **Powerful Aggregation**: Great for mood analytics and reporting
- **Scalability**: Atlas handles scaling as your user base grows
- **Reliability**: Built-in redundancy and backups

## Local Development
For local development, you can use:
1. MongoDB Community Server installed locally
2. MongoDB Compass for GUI database management
3. Docker MongoDB container for isolated development

Start local MongoDB:
```bash
# If installed locally
mongod --dbpath /path/to/your/data

# If using Docker
docker run -d -p 27017:27017 --name aurora-mongo mongo:latest
```