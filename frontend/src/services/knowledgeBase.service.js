import api from './api'

export async function listKnowledgeBases() {
  const { data } = await api.get('/knowledge-bases')
  return data.knowledgeBases
}

export async function createKnowledgeBase({ name, description }) {
  const { data } = await api.post('/knowledge-bases', { name, description })
  return data.knowledgeBase
}

export async function deleteKnowledgeBase(id) {
  await api.delete(`/knowledge-bases/${id}`)
}
