import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { connectDB } from '../config/mongodb.js';

const router = express.Router();

// Sign up route
router.post('/signup', async (req, res) => {
  try {
    await connectDB();
    
    const { email, password, fullName, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name: fullName,
      role,
      created_at: new Date(),
    });
    
    // Return user without password
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
    };
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sign in route
router.post('/login', async (req, res) => {
  try {
    await connectDB();
    
    const { email, password } = req.body;
    
    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Return user without password
    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url,
    };
    
    res.json(userResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user route
router.get('/me', async (req, res) => {
  try {
    await connectDB();
    
    // For now, we'll just return a mock response
    // In a real app, you'd verify the JWT token here
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Mock user response - in production, decode JWT and fetch from DB
    res.json({
      id: '1',
      email: 'user@example.com',
      full_name: 'Test User',
      role: 'student',
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;