import mongoose from 'mongoose';

const getMongoURI = (): string => {
  // Priority order: Atlas URI (production) > Local URI (development) > Default localhost
  const atlasURI = process.env.MONGODB_ATLAS_URI;
  const localURI = process.env.MONGODB_URI || "mongodb://localhost:27017/aurora";
  
  if (atlasURI) {
    console.log('🌐 Using MongoDB Atlas connection');
    return atlasURI;
  } else {
    console.log('🏠 Using local MongoDB connection');
    return localURI;
  }
};

const MONGODB_URI = getMongoURI();

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

export const connectDB = async (): Promise<mongoose.Connection> => {
  try {
    if (!global.mongoose) {
      global.mongoose = { conn: null, promise: null };
    }

    if (global.mongoose.conn) {
      console.log('Using existing MongoDB connection');
      return global.mongoose.conn;
    }

    if (!global.mongoose.promise) {
      console.log('Connecting to MongoDB...');
      
      const opts = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      };

      global.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((instance) => {
        console.log('MongoDB connected successfully');
        return instance.connection;
      }).catch((error) => {
        console.error('MongoDB connection failed:', error.message);
        global.mongoose = { conn: null, promise: null };
        throw error;
      });
    }

    const connection = await global.mongoose.promise;
    global.mongoose.conn = connection;
    return connection;

  } catch (error) {
    console.error('MongoDB connection error:', error instanceof Error ? error.message : 'Unknown error');
    global.mongoose = { conn: null, promise: null };
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (global.mongoose?.conn) {
      await global.mongoose.conn.close();
      global.mongoose = { conn: null, promise: null };
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error instanceof Error ? error.message : 'Unknown error');
  }
};

export default connectDB;
