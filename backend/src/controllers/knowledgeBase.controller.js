import { KnowledgeBase } from '../models/KnowledgeBase.js'
import { Document } from '../models/Document.js'
import { storageProvider } from '../services/storage/index.js'
import { deleteCollection } from '../services/aiService.client.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logger } from '../utils/logger.js'

export const listKnowledgeBases = asyncHandler(async (req, res) => {
  const knowledgeBases = await KnowledgeBase.find({ userId: req.user._id }).sort({ createdAt: -1 })
  res.json({ knowledgeBases })
})

export const createKnowledgeBase = asyncHandler(async (req, res) => {
  const { name, description } = req.body
  const knowledgeBase = await KnowledgeBase.create({ userId: req.user._id, name, description })
  res.status(201).json({ knowledgeBase })
})

export const getKnowledgeBase = asyncHandler(async (req, res) => {
  res.json({ knowledgeBase: req.resource })
})

export const updateKnowledgeBase = asyncHandler(async (req, res) => {
  const { name, description } = req.body
  if (name !== undefined) req.resource.name = name
  if (description !== undefined) req.resource.description = description
  await req.resource.save()
  res.json({ knowledgeBase: req.resource })
})

export const deleteKnowledgeBase = asyncHandler(async (req, res) => {
  // Deleting a KB removes its documents' stored files, metadata, and the
  // whole Qdrant collection holding their vectors.
  const documents = await Document.find({ knowledgeBaseId: req.resource._id })
  await Promise.all(
    documents.map((doc) =>
      storageProvider.deleteFile(doc.storageKey).catch((error) => {
        logger.warn(`Could not delete stored file for document ${doc._id}: ${error.message}`)
      })
    )
  )
  await deleteCollection(req.resource.qdrantCollectionName)
  await Document.deleteMany({ knowledgeBaseId: req.resource._id })
  await req.resource.deleteOne()
  res.status(204).send()
})
