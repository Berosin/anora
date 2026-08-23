import { Router } from 'express'
import { body } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.js'
import {
  sendMessage,
  listConversations,
  getConversation,
  deleteConversation,
} from '../controllers/chat.controller.js'

const router = Router()
router.use(requireAuth)

router.post(
  '/',
  [
    body('kbId').notEmpty().withMessage('kbId is required.'),
    body('question').trim().notEmpty().withMessage('question is required.').isLength({ max: 2000 }),
    body('conversationId').optional({ nullable: true }).isString(),
  ],
  validate,
  sendMessage
)
router.get('/conversations', listConversations)
router.get('/conversations/:id', getConversation)
router.delete('/conversations/:id', deleteConversation)

export default router
