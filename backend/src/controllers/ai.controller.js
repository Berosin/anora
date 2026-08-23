import { Document } from '../models/Document.js'
import { KnowledgeBase } from '../models/KnowledgeBase.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { summarizeDocument, compareDocuments } from '../services/aiService.client.js'

async function loadOwnedReadyDocument(documentId, userId) {
  const document = await Document.findOne({ _id: documentId, userId })
  if (!document) throw ApiError.notFound('Document not found.')
  if (document.status !== 'READY') {
    throw ApiError.badRequest(
      `"${document.originalFileName}" isn't ready yet (status: ${document.status}). Wait for it to finish indexing first.`
    )
  }
  const knowledgeBase = await KnowledgeBase.findById(document.knowledgeBaseId)
  if (!knowledgeBase) throw ApiError.notFound('Knowledge base not found.')
  return { document, knowledgeBase }
}

export const summarize = asyncHandler(async (req, res) => {
  const { documentId } = req.body
  if (!documentId) throw ApiError.badRequest('documentId is required.')

  const { document, knowledgeBase } = await loadOwnedReadyDocument(documentId, req.user._id)

  const result = await summarizeDocument({
    collectionName: knowledgeBase.qdrantCollectionName,
    documentId: document._id.toString(),
    documentName: document.originalFileName,
  })

  res.json({
    documentId: result.document_id,
    documentName: result.document_name,
    summary: result.summary,
  })
})

export const compare = asyncHandler(async (req, res) => {
  const { documentIdA, documentIdB } = req.body
  if (!documentIdA || !documentIdB) {
    throw ApiError.badRequest('documentIdA and documentIdB are required.')
  }
  if (documentIdA === documentIdB) {
    throw ApiError.badRequest('Choose two different documents to compare.')
  }

  const [a, b] = await Promise.all([
    loadOwnedReadyDocument(documentIdA, req.user._id),
    loadOwnedReadyDocument(documentIdB, req.user._id),
  ])

  const result = await compareDocuments({
    documentA: {
      collectionName: a.knowledgeBase.qdrantCollectionName,
      documentId: a.document._id.toString(),
      documentName: a.document.originalFileName,
    },
    documentB: {
      collectionName: b.knowledgeBase.qdrantCollectionName,
      documentId: b.document._id.toString(),
      documentName: b.document.originalFileName,
    },
  })

  res.json({
    documentA: result.document_a,
    documentB: result.document_b,
    comparison: result.comparison,
  })
})
