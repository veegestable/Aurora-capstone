# Local MongoDB Setup Guide for Aurora

## Overview
This guide helps you set up MongoDB locally for development. You can easily migrate to MongoDB Atlas later when your budget allows.

## Option 1: MongoDB Community Server (Recommended)

### Windows Installation
1. **Download MongoDB Community Server**
   - Go to [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Select Windows x64
   - Download the MSI installer

2. **Install MongoDB**
   - Run the downloaded MSI file
   - Choose "Complete" setup type
   - **Important**: Check "Install MongoDB as a Service"
   - **Important**: Check "Install MongoDB Compass" (GUI tool)

3. **Verify Installation**
   ```powershell
   # Check if MongoDB service is running
   Get-Service MongoDB
   
   # Test MongoDB connection
   mongo --version
   ```

4. **Start MongoDB (if not auto-started)**
   ```powershell
   # Start MongoDB service
   net start MongoDB
   
   # Or use Services.msc and start "MongoDB" service
   ```

### Alternative: Chocolatey Installation
```powershell
# Install via Chocolatey (if you have it)
choco install mongodb

# Start MongoDB service
net start MongoDB
```

## Option 2: Docker (If you prefer containers)

### Install with Docker
1. **Install Docker Desktop** (if not already installed)
2. **Run MongoDB Container**
   ```powershell
   # Create and run MongoDB container
   docker run -d `
     --name aurora-mongodb `
     -p 27017:27017 `
     -v mongodb_data:/data/db `
     mongo:latest
   
   # Verify it's running
   docker ps
   ```

3. **Start/Stop Container**
   ```powershell
   # Start container
   docker start aurora-mongodb
   
   # Stop container
   docker stop aurora-mongodb
   ```

## Environment Configuration

### Create .env file
```bash
# Copy the example file
cp .env.example .env
```

### Edit .env for local development
```env
# Local MongoDB (primary for development)
MONGODB_URI=mongodb://localhost:27017/aurora

# Future Atlas URI (for when you upgrade)
# MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/aurora

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_local_development_secret_key_change_for_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

## Database Management Tools

### MongoDB Compass (GUI - Recommended)
- **Installed automatically** with MongoDB Community Server
- **Connection String**: `mongodb://localhost:27017`
- **Database Name**: `aurora`
- Great for viewing data, running queries, and monitoring

### Command Line (mongo shell)
```powershell
# Connect to your database
mongo mongodb://localhost:27017/aurora

# Basic commands
show dbs                    # List databases
use aurora                  # Switch to aurora database
show collections            # List collections
db.users.find()            # View users
db.moodlogs.find().limit(5) # View recent mood logs
```

## Testing Your Setup

### Test MongoDB Connection
```bash
# From your server directory
cd server
npx ts-node test-mongodb.ts
```

### Start Your Aurora Server
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start frontend
cd ..
npm run dev
```

## Database Collections (Auto-created)
Aurora will automatically create these collections:
- **users** - User accounts and profiles
- **moodlogs** - Mood tracking entries
- **schedules** - Academic events and deadlines  
- **notifications** - System notifications

## Development Workflow

### Daily Development
1. **Start MongoDB** (usually auto-starts)
   ```powershell
   # Check if running
   Get-Service MongoDB
   
   # Start if needed
   net start MongoDB
   ```

2. **Start Aurora Application**
   ```bash
   # Start both frontend and backend
   npm run dev:all
   ```

3. **Monitor Database** (optional)
   - Open MongoDB Compass
   - Connect to `mongodb://localhost:27017`
   - Browse your `aurora` database

### Backup Your Data (Important!)
```powershell
# Create backup
mongodump --db aurora --out ./backups/$(Get-Date -Format "yyyy-MM-dd")

# Restore backup (if needed)
mongorestore --db aurora ./backups/2024-xx-xx/aurora/
```

## Migration to Atlas (Future)
When you're ready for Atlas:

1. **Export your data**
   ```bash
   mongodump --db aurora --out ./atlas-migration
   ```

2. **Update environment variables**
   ```env
   MONGODB_ATLAS_URI=your_atlas_connection_string
   # Comment out MONGODB_URI for production
   ```

3. **Import to Atlas**
   ```bash
   mongorestore --uri "mongodb+srv://..." --db aurora ./atlas-migration/aurora/
   ```

## Troubleshooting

### MongoDB Won't Start
```powershell
# Check Windows services
services.msc

# Or restart MongoDB service
net stop MongoDB
net start MongoDB
```

### Connection Refused
- Ensure MongoDB service is running
- Check if port 27017 is available
- Verify firewall isn't blocking MongoDB

### Database Not Found
- Databases are created automatically when first used
- Collections are created when first document is inserted

## Benefits of Local Development
- **Free** - No costs while developing
- **Fast** - No network latency
- **Offline** - Works without internet
- **Full Control** - Complete access to all features
- **Easy Testing** - Quick to reset/recreate data

## Data Storage Location
- **Windows**: `C:\Program Files\MongoDB\Server\{version}\data\`
- **Docker**: Inside the container volume `mongodb_data`

Your Aurora app is now ready for local MongoDB development! When your project grows and you have budget for Atlas, the migration will be seamless.