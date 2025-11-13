import mongoose, { Document, Schema } from 'mongoose';

export interface ISchedule {
  user_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  event_date: Date;
  event_type: 'exam' | 'deadline' | 'meeting' | 'other';
  created_at: Date;
  updated_at?: Date;
}

export interface IScheduleDocument extends ISchedule, Document {
  _id: mongoose.Types.ObjectId;
}

const scheduleSchema = new Schema<ISchedule>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: null,
  },
  event_date: {
    type: Date,
    required: true,
  },
  event_type: {
    type: String,
    required: true,
    enum: ['exam', 'deadline', 'meeting', 'other'],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

scheduleSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

export const Schedule = mongoose.models.Schedule || mongoose.model<ISchedule>('Schedule', scheduleSchema);
