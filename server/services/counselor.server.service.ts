import { User, IUser } from '../models/User';
import { MoodLog } from '../models/MoodLog';
import { Schedule } from '../models/Schedule';
import { Notification } from '../models/Notification';
import { connectDB } from '../config/mongodb';
import mongoose, { Document } from 'mongoose';

interface CounselorAccess {
  counselor_id: string;
  student_id: string;
  granted_at: Date;
}

interface UserDocument extends Document, IUser {
  _id: string;
}

// Create MongoDB Schema for counselor access
const counselorAccessSchema = new mongoose.Schema({
  counselor_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  granted_at: { type: Date, default: Date.now },
});

// Create model if it doesn't exist
const CounselorAccess = mongoose.models.CounselorAccess || 
  mongoose.model('CounselorAccess', counselorAccessSchema);

export const counselorServerService = {
  async grantAccess(counselorId: string, studentId: string) {
    await connectDB();
    const access = await CounselorAccess.create({
      counselor_id: counselorId,
      student_id: studentId,
      granted_at: new Date(),
    });
    return access._id.toString();
  },

  async revokeAccess(accessId: string) {
    await connectDB();
    await CounselorAccess.findByIdAndDelete(accessId);
  },

  async getAccessibleStudents(counselorId: string) {
    await connectDB();
    const accesses = await CounselorAccess.find({ counselor_id: counselorId });
    const studentIds = accesses.map(access => access.student_id);
    return User.find({
      _id: { $in: studentIds },
      role: 'student',
    });
  },

  async getStudents() {
    await connectDB();
    const students = await User.find({ role: 'student' }) as UserDocument[];
    return students.map(student => ({
      id: student._id,
      full_name: student.full_name,
      email: student.email,
      role: student.role,
    }));
  },

  async getStudentMoodLogs(studentId: string, startDate?: string, endDate?: string) {
    await connectDB();
    const query: any = { user_id: studentId };

    if (startDate || endDate) {
      query.log_date = {};
      if (startDate) query.log_date.$gte = new Date(startDate);
      if (endDate) query.log_date.$lte = new Date(endDate);
    }

    const logs = await MoodLog.find(query).sort({ log_date: -1 });

    return logs.map(log => ({
      id: log._id.toString(),
      ...log.toObject(),
    }));
  },

  async getStudentSchedules(studentId: string, startDate?: string, endDate?: string) {
    await connectDB();
    const query: any = { user_id: studentId };

    if (startDate || endDate) {
      query.event_date = {};
      if (startDate) query.event_date.$gte = new Date(startDate);
      if (endDate) query.event_date.$lte = new Date(endDate);
    }

    const schedules = await Schedule.find(query).sort({ event_date: 1 });

    return schedules.map(schedule => ({
      id: schedule._id.toString(),
      ...schedule.toObject(),
    }));
  },

  async sendMessageToStudent(counselorId: string, studentId: string, message: string) {
    await connectDB();
    const notification = await Notification.create({
      user_id: studentId,
      type: 'info',
      title: 'Message from Counselor',
      message,
      scheduled_for: new Date(),
      status: 'unread',
      created_at: new Date(),
    });

    return notification._id.toString();
  },
};