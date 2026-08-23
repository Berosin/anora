import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { KnowledgeBase } from '../models/KnowledgeBase.js'
import { Usage } from '../models/Usage.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { queryKnowledgeBase } from '../services/aiService.client.js'
import { logger } from '../utils/logger.js'

const FALLBACK_ANSWER = 'Something went wrong answering this question. Please try again.'

function mapSources(sources = []) {
  return sources.map((s) => ({
    documentId: s.document_id,
    documentName: s.document_name,
    page: s.page ?? null,
    excerpt: s.excerpt,
    score: s.score ?? null,
  }))
}

export const sendMessage = asyncHandler(async (req, res) => {
  const { kbId, conversationId, question } = req.body
  if (!kbId) throw ApiError.badRequest('kbId is required.')
  if (!question || !question.trim()) throw ApiError.badRequest('question is required.')

  const knowledgeBase = await KnowledgeBase.findOne({ _id: kbId, userId: req.user._id })
  if (!knowledgeBase) throw ApiError.notFound('Knowledge base not found.')

  let conversation
  if (conversationId) {
    conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
      knowledgeBaseId: kbId,
    })
    if (!conversation) throw ApiError.notFound('Conversation not found.')
  } else {
    conversation = await Conversation.create({
      userId: req.user._id,
      knowledgeBaseId: kbId,
      // A short title from the first question, so the sidebar has
      // something more useful than "New conversation" to show.
      title: question.trim().slice(0, 60),
    })
  }

  const userMessage = await Message.create({
    conversationId: conversation._id,
    role: 'user',
    content: question.trim(),
  })

  let assistantMessage
  try {
    const result = await queryKnowledgeBase({
      question: question.trim(),
      collectionName: knowledgeBase.qdrantCollectionName,
      topK: 5,
    })
    assistantMessage = await Message.create({
      conversationId: conversation._id,
      role: 'assistant',
      content: result.answer,
      sources: mapSources(result.sources),
    })
  } catch (error) {
    // The AI service being down/erroring shouldn't corrupt the
    // conversation — the failure is recorded as a real assistant message
    // the user can see, not a silent gap or a thrown 500.
    assistantMessage = await Message.create({
      conversationId: conversation._id,
      role: 'assistant',
      content: FALLBACK_ANSWER,
      sources: [],
    })
    logger.error(`Chat query failed for conversation ${conversation._id}: ${error.message}`)
  }

  // Touch the conversation so it sorts to the top of the sidebar by
  // recency; timestamps middleware bumps updatedAt on any save().
  await conversation.save()

  await Usage.updateOne(
    { userId: req.user._id },
    { $inc: { questionsAsked: 1 }, lastActiveAt: new Date() },
    { upsert: true }
  )

  res.status(201).json({ conversation, userMessage, assistantMessage })
})

export const listConversations = asyncHandler(async (req, res) => {
  const { kbId } = req.query
  const filter = { userId: req.user._id }
  if (kbId) filter.knowledgeBaseId = kbId

  const conversations = await Conversation.find(filter).sort({ updatedAt: -1 })
  res.json({ conversations })
})

export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
  if (!conversation) throw ApiError.notFound('Conversation not found.')

  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 })
  res.json({ conversation, messages })
})

export const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
  if (!conversation) throw ApiError.notFound('Conversation not found.')

  await Message.deleteMany({ conversationId: conversation._id })
  await conversation.deleteOne()

  res.status(204).send()
})
