import express from 'express';
import { MoodLog } from '../models/MoodLog.js';
import { connectDB } from '../config/mongodb.js';

const router = express.Router();

// Create mood log
router.post('/', async (req, res) => {
  try {
    await connectDB();
    
    const moodLog = await MoodLog.create(req.body);
    res.status(201).json({
      id: moodLog._id.toString(),
      ...moodLog.toObject(),
    });
  } catch (error) {
    console.error('Create mood log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get mood logs
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    const { userId, startDate, endDate } = req.query;
    const query: any = { user_id: userId };
    
    if (startDate || endDate) {
      query.log_date = {};
      if (startDate) query.log_date.$gte = new Date(startDate as string);
      if (endDate) query.log_date.$lte = new Date(endDate as string);
    }
    
    const logs = await MoodLog.find(query).sort({ log_date: -1 });
    
    const response = logs.map(log => ({
      id: log._id.toString(),
      ...log.toObject(),
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Get mood logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;