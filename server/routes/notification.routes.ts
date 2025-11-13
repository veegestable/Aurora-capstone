import express from 'express';
import { Notification } from '../models/Notification.js';
import { connectDB } from '../config/mongodb.js';

const router = express.Router();

// Create notification
router.post('/', async (req, res) => {
  try {
    await connectDB();
    
    const notification = await Notification.create(req.body);
    res.status(201).json({
      id: notification._id.toString(),
      ...notification.toObject(),
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get notifications
router.get('/', async (req, res) => {
  try {
    await connectDB();
    
    const { userId } = req.query;
    const notifications = await Notification.find({ user_id: userId })
      .sort({ created_at: -1 });
    
    const response = notifications.map(notification => ({
      id: notification._id.toString(),
      ...notification.toObject(),
    }));
    
    res.json(response);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread', async (req, res) => {
  try {
    await connectDB();
    
    const { userId } = req.query;
    const count = await Notification.countDocuments({
      user_id: userId,
      status: 'unread'
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  try {
    await connectDB();
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({
      id: notification._id.toString(),
      ...notification.toObject(),
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;