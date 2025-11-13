import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { Schedule } from '../models/Schedule.js';
import { connectDB } from '../config/mongodb.js';

const router = express.Router();

// Create schedule
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await connectDB();
    
    const schedule = await Schedule.create(req.body);
    res.status(201).json({
      id: schedule._id.toString(),
      ...schedule.toObject(),
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get schedules
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await connectDB();
    
    const { userId, startDate, endDate } = req.query;
    const query: any = { user_id: userId };
    
    if (startDate || endDate) {
      query.event_date = {};
      if (startDate) query.event_date.$gte = new Date(startDate as string);
      if (endDate) query.event_date.$lte = new Date(endDate as string);
    }
    
    const schedules = await Schedule.find(query).sort({ event_date: 1 });
    
    const response = schedules.map(schedule => ({
      id: schedule._id.toString(),
      ...schedule.toObject(),
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update schedule
router.patch('/:id', async (req, res) => {
  try {
    await connectDB();
    
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({
      id: schedule._id.toString(),
      ...schedule.toObject(),
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete schedule
router.delete('/:id', async (req, res) => {
  try {
    await connectDB();
    
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;