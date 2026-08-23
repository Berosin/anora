import mongoose from 'mongoose'

const sourceSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    documentName: { type: String, required: true },
    page: { type: Number, default: null },
    excerpt: { type: String, required: true },
    score: { type: Number, default: null },
  },
  { _id: false }
)

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: { type: [sourceSchema], default: [] },
  },
  { timestamps: true }
)

export const Message = mongoose.model('Message', messageSchema)
