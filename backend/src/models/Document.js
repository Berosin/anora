import mongoose from 'mongoose'

export const DOCUMENT_STATUSES = ['UPLOADING', 'PROCESSING', 'INDEXING', 'READY', 'FAILED']
export const DOCUMENT_TYPES = ['pdf', 'docx', 'txt']

const documentSchema = new mongoose.Schema(
  {
    knowledgeBaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeBase', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    originalFileName: { type: String, required: true },
    storageKey: { type: String, required: true }, // key/path with the storage provider
    storageUrl: { type: String, default: '' }, // set once the file is actually stored — empty while UPLOADING
    fileType: { type: String, enum: DOCUMENT_TYPES, required: true },
    fileSizeBytes: { type: Number, required: true },

    status: { type: String, enum: DOCUMENT_STATUSES, default: 'UPLOADING', index: true },
    failureReason: { type: String, default: null },

    pageCount: { type: Number, default: null },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Document = mongoose.model('Document', documentSchema)
