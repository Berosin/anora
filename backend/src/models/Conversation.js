import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', required: true, index: true },
    title: { type: String, trim: true, default: 'New conversation' },
  },
  { timestamps: true }
)

export const Conversation = mongoose.model('Conversation', conversationSchema)
