import express from 'express';
import { counselorServerService } from '../services/counselor.server.service.js';

const router = express.Router();

// Grant access
router.post('/access', async (req, res) => {
  try {
    const { counselor_id, student_id } = req.body;
    const accessId = await counselorServerService.grantAccess(counselor_id, student_id);
    res.status(201).json({ id: accessId });
  } catch (error) {
    console.error('Grant access error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Revoke access
router.delete('/access/:id', async (req, res) => {
  try {
    await counselorServerService.revokeAccess(req.params.id);
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get students
router.get('/students', async (req, res) => {
  try {
    const students = await counselorServerService.getStudents();
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get student mood logs
router.get('/students/:id/moods', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await counselorServerService.getStudentMoodLogs(
      req.params.id,
      startDate as string,
      endDate as string
    );
    res.json(logs);
  } catch (error) {
    console.error('Get student mood logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get student schedules
router.get('/students/:id/schedules', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const schedules = await counselorServerService.getStudentSchedules(
      req.params.id,
      startDate as string,
      endDate as string
    );
    res.json(schedules);
  } catch (error) {
    console.error('Get student schedules error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Send message to student
router.post('/message', async (req, res) => {
  try {
    const { counselor_id, student_id, message } = req.body;
    const notificationId = await counselorServerService.sendMessageToStudent(
      counselor_id,
      student_id,
      message
    );
    res.status(201).json({ id: notificationId });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;