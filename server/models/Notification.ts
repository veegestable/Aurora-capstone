import mongoose, { Document, Schema } from 'mongoose';

export interface INotification {
  user_id: mongoose.Types.ObjectId;
  type: 'mood_reminder' | 'event_reminder' | 'counselor_message';
  message: string;
  status: 'pending' | 'sent' | 'read';
  scheduled_for: Date;
  created_at: Date;
}

export interface INotificationDocument extends INotification, Document {
  _id: mongoose.Types.ObjectId;
}

const notificationSchema = new Schema<INotification>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['mood_reminder', 'event_reminder', 'counselor_message'],
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'read'],
    default: 'pending',
  },
  scheduled_for: {
    type: Date,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
