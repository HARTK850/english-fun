import mongoose from 'mongoose';

const LearningHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  wordId: mongoose.Schema.Types.ObjectId,
  success: Boolean,
  responseTime: Number,
  difficulty: String
});

const WordSchema = new mongoose.Schema({
  en: String,
  he: String,
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  lastSeen: Date,
  level: { type: Number, default: 1 }
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  words: [WordSchema],
  history: [LearningHistorySchema],
  stats: {
    accuracy: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    currentLevel: { type: String, default: 'Beginner' }
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);