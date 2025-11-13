// MongoDB Local Setup Checker for Aurora
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkMongoDBSetup() {
  console.log('🔍 Checking MongoDB Local Setup for Aurora...\n');

  try {
    // Check if MongoDB service is running on Windows
    console.log('1. Checking MongoDB Service Status...');
    try {
      const { stdout } = await execAsync('sc query MongoDB');
      if (stdout.includes('RUNNING')) {
        console.log('   ✅ MongoDB service is running');
      } else {
        console.log('   ⚠️  MongoDB service exists but not running');
        console.log('   💡 Try: net start MongoDB');
      }
    } catch (error) {
      console.log('   ❌ MongoDB service not found');
      console.log('   💡 Install MongoDB Community Server from: https://www.mongodb.com/try/download/community');
    }

    // Check if MongoDB is accessible on port 27017
    console.log('\n2. Testing MongoDB Connection...');
    try {
      const mongoose = await import('mongoose');
      await mongoose.connect('mongodb://localhost:27017/aurora-test', {
        serverSelectionTimeoutMS: 3000
      });
      console.log('   ✅ Successfully connected to MongoDB on localhost:27017');
      await mongoose.disconnect();
    } catch (error) {
      console.log('   ❌ Cannot connect to MongoDB on localhost:27017');
      console.log('   💡 Make sure MongoDB is installed and running');
    }

    // Check if mongo command is available
    console.log('\n3. Checking MongoDB CLI Tools...');
    try {
      await execAsync('mongo --version');
      console.log('   ✅ MongoDB CLI tools available');
    } catch (error) {
      console.log('   ⚠️  MongoDB CLI tools not found (optional)');
    }

    console.log('\n📋 Setup Summary:');
    console.log('   • Database: aurora');
    console.log('   • Connection: mongodb://localhost:27017/aurora');
    console.log('   • GUI Tool: MongoDB Compass (recommended)');
    console.log('\n🚀 Ready to start Aurora development!');
    console.log('\n📖 For setup help, see: LOCAL_MONGODB_SETUP.md');

  } catch (error) {
    console.error('❌ Error checking MongoDB setup:', error);
  }

  process.exit(0);
}

checkMongoDBSetup();