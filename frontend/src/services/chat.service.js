import api from './api'

export async function listConversations(kbId) {
  const { data } = await api.get('/chat/conversations', { params: { kbId } })
  return data.conversations
}

export async function getConversation(id) {
  const { data } = await api.get(`/chat/conversations/${id}`)
  return data // { conversation, messages }
}

export async function sendMessage({ kbId, conversationId, question }) {
  const { data } = await api.post('/chat', { kbId, conversationId, question })
  return data // { conversation, userMessage, assistantMessage }
}

export async function deleteConversation(id) {
  await api.delete(`/chat/conversations/${id}`)
}
