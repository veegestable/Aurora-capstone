import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Configure dotenv to look for .env in the parent directory
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

console.log('🔧 Starting server configuration...');
console.log('📦 Port:', PORT);
console.log('🔐 JWT Secret exists:', !!JWT_SECRET);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aurora';
    console.log('🔗 Connecting to MongoDB:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'counselor'], default: 'student' },
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// MoodLog Schema
const moodLogSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  emotions: [{
    emotion: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    color: { type: String, required: true }
  }],
  notes: { type: String, default: '' },
  log_date: { type: Date, required: true, index: true },
  energy_level: { type: Number, default: 5, min: 1, max: 10 },
  stress_level: { type: Number, default: 3, min: 1, max: 10 },
  detection_method: { type: String, enum: ['manual', 'ai'], default: 'manual' },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

const MoodLog = mongoose.model('MoodLog', moodLogSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['mood_reminder', 'event_reminder', 'counselor_message'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'read'], default: 'sent' },
  scheduled_for: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth check - Header:', authHeader);
  console.log('🎫 Token:', token ? 'Present' : 'Missing');

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ Token verified:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('💓 Health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// Auth - Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    console.log('📝 Signup request body:', JSON.stringify(req.body, null, 2));
    
    // Handle both fullName and full_name field names
    const { email, password, role, fullName, full_name } = req.body;
    const actualFullName = fullName || full_name;

    console.log('📝 Parsed fields:', {
      email,
      fullName: actualFullName,
      role,
      passwordProvided: !!password
    });

    if (!actualFullName || !email || !password) {
      console.log('❌ Missing required fields:', {
        fullName: !!actualFullName,
        email: !!email,
        password: !!password
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('🔍 Checking if user exists:', email);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('👤 Creating new user...');
    const user = new User({
      full_name: actualFullName,
      email,
      password: hashedPassword,
      role: role || 'student'
    });

    await user.save();
    console.log('✅ User created successfully:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = {
      message: 'User created successfully',
      token,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    };

    console.log('📤 Sending signup response:', {
      ...response,
      token: '***HIDDEN***'
    });

    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Signup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error during signup',
      error: errorMessage
    });
  }
});

// Auth - Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login request body:', JSON.stringify(req.body, null, 2));
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('🔍 Looking for user:', email);
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('👤 Found user:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    console.log('🔒 Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const response = {
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    };

    console.log('✅ Login successful for:', email);
    console.log('📤 Sending login response:', {
      ...response,
      token: '***HIDDEN***'
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error during login',
      error: errorMessage
    });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  try {
    console.log('👤 Getting current user for ID:', req.user.userId);
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      console.log('❌ User not found in database:', req.user.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Current user found:', user.email);
    res.json({
      id: user._id.toString(),
      full_name: user.full_name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Create mood log
app.post('/api/moods', authenticateToken, async (req: any, res) => {
  try {
    console.log('🎭 Creating mood log for user:', req.user.userId);
    console.log('🎭 Mood data:', JSON.stringify(req.body, null, 2));
    
    const { emotions, notes, log_date, energy_level, stress_level, detection_method } = req.body;
    
    if (!emotions || !Array.isArray(emotions) || emotions.length === 0) {
      console.log('❌ Invalid emotions data');
      return res.status(400).json({ message: 'Emotions array is required' });
    }

    const moodLog = new MoodLog({
      user_id: req.user.userId,
      emotions,
      notes: notes || '',
      log_date: log_date || new Date(),
      energy_level: energy_level || 5,
      stress_level: stress_level || 3,
      detection_method: detection_method || 'manual'
    });

    await moodLog.save();
    console.log('✅ Mood log created:', moodLog._id);
    
    res.status(201).json({
      id: moodLog._id.toString(),
      user_id: moodLog.user_id,
      emotions: moodLog.emotions,
      notes: moodLog.notes,
      log_date: moodLog.log_date,
      energy_level: moodLog.energy_level,
      stress_level: moodLog.stress_level,
      detection_method: moodLog.detection_method,
      created_at: moodLog.created_at
    });
  } catch (error) {
    console.error('❌ Create mood error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Get mood logs
app.get('/api/moods', authenticateToken, async (req: any, res) => {
  try {
    console.log('📊 Getting mood logs for user:', req.user.userId);
    const { start_date, end_date } = req.query;
    
    let query: any = { user_id: req.user.userId };
    
    if (start_date && end_date) {
      query.log_date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }
    
    const moodLogs = await MoodLog.find(query).sort({ log_date: -1 });
    console.log(`✅ Found ${moodLogs.length} mood logs`);
    
    res.json(moodLogs);
  } catch (error) {
    console.error('❌ Get mood logs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Notification Routes

// Get notifications for user
app.get('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    console.log('📨 Getting notifications for user:', req.user.userId);
    
    const notifications = await Notification.find({ 
      user_id: req.user.userId 
    }).sort({ created_at: -1 }).limit(50);
    
    console.log(`✅ Found ${notifications.length} notifications`);
    res.json(notifications);
  } catch (error) {
    console.error('❌ Get notifications error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Get unread count
app.get('/api/notifications/unread-count', authenticateToken, async (req: any, res) => {
  try {
    console.log('📊 Getting unread count for user:', req.user.userId);
    
    const count = await Notification.countDocuments({
      user_id: req.user.userId,
      status: { $in: ['pending', 'sent'] }
    });
    
    console.log(`✅ Unread count: ${count}`);
    res.json({ count });
  } catch (error) {
    console.error('❌ Get unread count error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res) => {
  try {
    console.log('✅ Marking notification as read:', req.params.id);
    
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: req.params.id,
        user_id: req.user.userId 
      },
      { status: 'read' },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    console.log('✅ Notification marked as read');
    res.json(notification);
  } catch (error) {
    console.error('❌ Mark as read error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Create notification
app.post('/api/notifications', authenticateToken, async (req: any, res) => {
  try {
    console.log('📨 Creating notification:', req.body);
    
    const { type, message, scheduled_for, userId } = req.body;
    
    const notification = new Notification({
      user_id: userId || req.user.userId,
      type,
      message,
      scheduled_for: scheduled_for || new Date(),
      status: 'sent'
    });
    
    await notification.save();
    console.log('✅ Notification created:', notification._id);
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('❌ Create notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage
    });
  }
});

// Error handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.use('*', (req, res) => {
  console.log('❓ Route not found:', req.method, req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📡 API Base: http://localhost:${PORT}/api`);
      console.log(`💓 Health check: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();