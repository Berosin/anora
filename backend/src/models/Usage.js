import mongoose from 'mongoose'

const usageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    documentsProcessed: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    storageUsedBytes: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const Usage = mongoose.model('Usage', usageSchema)
