import mongoose from 'mongoose'

const knowledgeBaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },

    // Each knowledge base owns exactly one Qdrant collection, so its
    // vectors are namespace-isolated from every other knowledge base
    // (including other KBs owned by the same user).
    qdrantCollectionName: { type: String, required: true, unique: true },

    documentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

knowledgeBaseSchema.pre('validate', function assignCollectionName() {
  if (!this.qdrantCollectionName) {
    this.qdrantCollectionName = `kb_${this._id.toString()}`
  }
})

export const KnowledgeBase = mongoose.model('KnowledgeBase', knowledgeBaseSchema)
