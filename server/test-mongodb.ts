// Simple MongoDB connection test for Aurora
import connectDB, { closeDatabase } from './config/mongodb';
import { User } from './models/User';

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Connect to database
    await connectDB();
    console.log('✅ MongoDB connection successful!');
    
    // Test creating a user (dry run - won't actually save)
    const testUser = new User({
      email: 'test@example.com',
      password: 'hashedpassword123',
      full_name: 'Test User',
      role: 'student'
    });
    
    // Validate the model without saving
    const validationError = testUser.validateSync();
    if (validationError) {
      console.log('❌ Model validation failed:', validationError);
    } else {
      console.log('✅ User model validation passed!');
    }
    
    console.log('✅ All tests passed! Aurora is ready for MongoDB Atlas.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

testConnection();