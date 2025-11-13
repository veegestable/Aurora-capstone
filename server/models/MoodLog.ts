import mongoose, { Document, Schema } from 'mongoose';

export interface IMoodLog {
  user_id: mongoose.Types.ObjectId;
  emotions: string[];
  colors: string[];
  confidence: number[];
  selfie_url?: string;
  note?: string;
  log_date: Date;
  created_at: Date;
}

export interface IMoodLogDocument extends IMoodLog, Document {
  _id: mongoose.Types.ObjectId;
}

const moodLogSchema = new Schema<IMoodLog>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emotions: [{
    type: String,
    required: true,
  }],
  colors: [{
    type: String,
    required: true,
  }],
  confidence: [{
    type: Number,
    required: true,
    min: 0,
    max: 1,
  }],
  selfie_url: {
    type: String,
    default: null,
  },
  note: {
    type: String,
    default: null,
  },
  log_date: {
    type: Date,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export const MoodLog = mongoose.models.MoodLog || mongoose.model<IMoodLog>('MoodLog', moodLogSchema);
