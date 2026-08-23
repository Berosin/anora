import api from './api'

export async function summarizeDocument(documentId) {
  const { data } = await api.post('/ai/summarize', { documentId })
  return data // { documentId, documentName, summary }
}

export async function compareDocuments(documentIdA, documentIdB) {
  const { data } = await api.post('/ai/compare', { documentIdA, documentIdB })
  return data // { documentA, documentB, comparison }
}
