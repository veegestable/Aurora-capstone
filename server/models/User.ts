import mongoose, { Document, Schema } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'counselor';
  avatar_url?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'counselor'],
  },
  avatar_url: {
    type: String,
    default: null,
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

userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
