import api from './api'

export async function listDocuments({ kbId, search } = {}) {
  const { data } = await api.get('/documents', { params: { kbId, search } })
  return data.documents
}

export async function uploadDocument({ file, kbId }, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('kbId', kbId)
  const { data } = await api.post('/documents/upload', formData, {
    onUploadProgress,
  })
  return data.document
}

export async function getDocumentStatus(id) {
  const { data } = await api.get(`/documents/${id}/status`)
  return data.document
}

export async function deleteDocument(id) {
  await api.delete(`/documents/${id}`)
}
