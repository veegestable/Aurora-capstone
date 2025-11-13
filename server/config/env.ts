import dotenv from 'dotenv';

dotenv.config();

export const config = {
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/aurora",
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development'
};