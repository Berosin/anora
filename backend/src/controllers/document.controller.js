import { randomUUID } from 'crypto'
import path from 'path'
import { Document } from '../models/Document.js'
import { KnowledgeBase } from '../models/KnowledgeBase.js'
import { Usage } from '../models/Usage.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { storageProvider } from '../services/storage/index.js'
import { indexDocumentWithAiService, deleteDocumentVectors } from '../services/aiService.client.js'
import { resolveDocumentType } from '../middleware/upload.middleware.js'
import { logger } from '../utils/logger.js'

async function assertOwnsKnowledgeBase(kbId, userId) {
  const knowledgeBase = await KnowledgeBase.findOne({ _id: kbId, userId })
  if (!knowledgeBase) {
    throw ApiError.notFound('Knowledge base not found.')
  }
  return knowledgeBase
}

export const uploadDocument = asyncHandler(async (req, res) => {
  // Indexing runs synchronously within this request (no background job
  // queue) — simplest correct option within the ₹0/no-extra-infra
  // constraint, and fine at student-project volumes. A queue (e.g.
  // BullMQ + a free Redis tier) is the natural upgrade path, noted as a
  // future improvement rather than built now.
  const { kbId } = req.body
  if (!kbId) throw ApiError.badRequest('kbId is required.')
  if (!req.file) throw ApiError.badRequest('No file was uploaded.')

  const knowledgeBase = await assertOwnsKnowledgeBase(kbId, req.user._id)

  const fileType = resolveDocumentType(req.file.mimetype)
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storageKey = `${req.user._id}/${randomUUID()}-${safeName}`

  // Create the record first with UPLOADING status, so a failure partway
  // through the actual file write still leaves an inspectable trail
  // rather than a silently lost upload.
  const document = await Document.create({
    knowledgeBaseId: knowledgeBase._id,
    userId: req.user._id,
    originalFileName: req.file.originalname,
    storageKey,
    storageUrl: '',
    fileType,
    fileSizeBytes: req.file.size,
    status: 'UPLOADING',
  })

  try {
    const { storageUrl } = await storageProvider.uploadFile(req.file.buffer, storageKey)

    document.storageUrl = storageUrl
    document.status = 'INDEXING'
    await document.save()

    // Counted as soon as it's stored, regardless of eventual processing
    // outcome — this keeps "N documents" on the knowledge base card in
    // sync with what actually shows up in the Documents list, rather
    // than silently excluding FAILED documents from the count.
    knowledgeBase.documentCount += 1
    await knowledgeBase.save()

    logger.info(`Document stored, indexing started: ${document._id} (${fileType}, ${req.file.size}B)`)

    try {
      const result = await indexDocumentWithAiService({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        documentId: document._id.toString(),
        documentName: document.originalFileName,
        knowledgeBaseId: knowledgeBase._id.toString(),
        fileType,
        collectionName: knowledgeBase.qdrantCollectionName,
      })

      document.status = 'READY'
      document.chunkCount = result.chunk_count
      document.pageCount = result.page_count ?? null
      await document.save()

      await Usage.updateOne(
        { userId: req.user._id },
        { $inc: { documentsProcessed: 1 }, lastActiveAt: new Date() },
        { upsert: true }
      )

      logger.info(`Document indexed: ${document._id} (${result.chunk_count} chunks)`)
    } catch (indexingError) {
      // The file itself was stored successfully — only indexing failed.
      // The document stays visible with a clear failure reason rather
      // than silently vanishing or being reported as READY.
      document.status = 'FAILED'
      document.failureReason =
        indexingError.message?.slice(0, 500) ||
        'The AI service could not process this document. Is it running?'
      await document.save()
      logger.error(`Document indexing failed: ${document._id} — ${indexingError.message}`)
    }
  } catch (error) {
    document.status = 'FAILED'
    document.failureReason = 'Could not save the uploaded file. Please try again.'
    await document.save()
    logger.error(`Document upload failed: ${document._id} — ${error.message}`)
    throw ApiError.internal('The file could not be stored. Please try again.')
  }

  res.status(201).json({ document })
})

export const listDocuments = asyncHandler(async (req, res) => {
  const { kbId, search } = req.query
  const filter = { userId: req.user._id }
  if (kbId) filter.knowledgeBaseId = kbId
  if (search) filter.originalFileName = { $regex: search, $options: 'i' }

  const documents = await Document.find(filter).sort({ createdAt: -1 })
  res.json({ documents })
})

export const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id })
  if (!document) throw ApiError.notFound('Document not found.')
  res.json({ document })
})

export const getDocumentStatus = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id }).select(
    'status failureReason chunkCount pageCount'
  )
  if (!document) throw ApiError.notFound('Document not found.')
  res.json({ document })
})

export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id })
  if (!document) throw ApiError.notFound('Document not found.')

  const knowledgeBase = await KnowledgeBase.findById(document.knowledgeBaseId)

  await storageProvider.deleteFile(document.storageKey).catch((error) => {
    // Don't block the metadata deletion on a storage cleanup failure —
    // log it so it isn't silently lost, but the user's intent to delete
    // still succeeds.
    logger.warn(`Could not delete stored file for document ${document._id}: ${error.message}`)
  })

  if (knowledgeBase) {
    await deleteDocumentVectors({
      collectionName: knowledgeBase.qdrantCollectionName,
      documentId: document._id.toString(),
    })
  }

  await document.deleteOne()

  await KnowledgeBase.updateOne(
    { _id: document.knowledgeBaseId },
    { $inc: { documentCount: -1 } }
  )

  res.status(204).send()
})

// Streams the file back only to its owner — local storage has no public
// URL of its own, so this route is what storageUrl actually points at.
export const downloadDocumentFile = asyncHandler(async (req, res) => {
  const storageKey = decodeURIComponent(req.params.storageKey)

  // storageKey is namespaced as "<userId>/<uuid>-<filename>" — this check
  // stops a user from guessing another user's storage key and reading it.
  if (!storageKey.startsWith(`${req.user._id}/`)) {
    throw ApiError.forbidden()
  }

  const document = await Document.findOne({ storageKey, userId: req.user._id })
  if (!document) throw ApiError.notFound('File not found.')

  const buffer = await storageProvider.readFile(storageKey).catch(() => null)
  if (!buffer) throw ApiError.notFound('File not found in storage.')

  res.setHeader('Content-Disposition', `inline; filename="${path.basename(document.originalFileName)}"`)
  res.send(buffer)
})
