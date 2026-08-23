import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

/**
 * Sends an uploaded file to the AI service to be extracted, chunked,
 * embedded, and stored in the knowledge base's Qdrant collection.
 * Uses the platform's native fetch/FormData/Blob (Node 18+) rather than
 * axios, since axios's multipart handling doesn't play well with native
 * FormData — no extra dependency needed for one internal call.
 */
export async function indexDocumentWithAiService({
  buffer,
  filename,
  mimetype,
  documentId,
  documentName,
  knowledgeBaseId,
  fileType,
  collectionName,
}) {
  const formData = new FormData()
  formData.append('file', new Blob([buffer], { type: mimetype }), filename)
  formData.append('document_id', documentId)
  formData.append('document_name', documentName)
  formData.append('knowledge_base_id', knowledgeBaseId)
  formData.append('file_type', fileType)
  formData.append('collection_name', collectionName)

  const response = await fetch(`${env.aiServiceUrl}/internal/index-document`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.detail || 'The AI service could not process this document.')
    error.statusCode = response.status
    throw error
  }

  return response.json() // { chunk_count, page_count }
}

/** Best-effort cleanup — a failed vector deletion is logged, not thrown,
 * so it never blocks the user-facing delete they actually asked for. */
export async function deleteDocumentVectors({ collectionName, documentId }) {
  try {
    const res = await fetch(
      `${env.aiServiceUrl}/internal/collections/${collectionName}/documents/${documentId}`,
      { method: 'DELETE' }
    )
    if (!res.ok) throw new Error(`AI service responded ${res.status}`)
  } catch (error) {
    logger.warn(`Could not delete vectors for document ${documentId}: ${error.message}`)
  }
}

export async function deleteCollection(collectionName) {
  try {
    const res = await fetch(`${env.aiServiceUrl}/internal/collections/${collectionName}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error(`AI service responded ${res.status}`)
  } catch (error) {
    logger.warn(`Could not delete Qdrant collection ${collectionName}: ${error.message}`)
  }
}

/**
 * Asks a question against one knowledge base's Qdrant collection. Returns
 * { answer, sources, grounded } — grounded is false when the AI service
 * found no relevant context at all (e.g. an empty knowledge base), in
 * which case `answer` is already the honest "not enough information"
 * message rather than something the caller needs to construct itself.
 */
export async function queryKnowledgeBase({ question, collectionName, topK = 5 }) {
  const response = await fetch(`${env.aiServiceUrl}/internal/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, collection_name: collectionName, top_k: topK }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.detail || 'The AI service could not answer this question.')
    error.statusCode = response.status
    throw error
  }

  return response.json()
}

export async function summarizeDocument({ collectionName, documentId, documentName }) {
  const response = await fetch(`${env.aiServiceUrl}/internal/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection_name: collectionName,
      document_id: documentId,
      document_name: documentName,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.detail || 'The AI service could not summarize this document.')
    error.statusCode = response.status
    throw error
  }

  return response.json() // { document_id, document_name, summary }
}

export async function compareDocuments({ documentA, documentB }) {
  const response = await fetch(`${env.aiServiceUrl}/internal/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection_name_a: documentA.collectionName,
      document_id_a: documentA.documentId,
      document_name_a: documentA.documentName,
      collection_name_b: documentB.collectionName,
      document_id_b: documentB.documentId,
      document_name_b: documentB.documentName,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error = new Error(body.detail || 'The AI service could not compare these documents.')
    error.statusCode = response.status
    throw error
  }

  return response.json() // { document_a, document_b, comparison }
}
