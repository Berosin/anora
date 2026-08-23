import { Router } from 'express'
import { body } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOwnership } from '../middleware/ownership.middleware.js'
import { validate } from '../middleware/validate.js'
import { KnowledgeBase } from '../models/KnowledgeBase.js'
import {
  listKnowledgeBases,
  createKnowledgeBase,
  getKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '../controllers/knowledgeBase.controller.js'

const router = Router()

const nameRule = body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 })
const descriptionRule = body('description').optional().trim().isLength({ max: 500 })

router.use(requireAuth)

router.get('/', listKnowledgeBases)
router.post('/', [nameRule, descriptionRule], validate, createKnowledgeBase)

router.get('/:id', requireOwnership(KnowledgeBase, { attachAs: 'resource' }), getKnowledgeBase)
router.put(
  '/:id',
  [nameRule.optional(), descriptionRule],
  validate,
  requireOwnership(KnowledgeBase, { attachAs: 'resource' }),
  updateKnowledgeBase
)
router.delete('/:id', requireOwnership(KnowledgeBase, { attachAs: 'resource' }), deleteKnowledgeBase)

export default router
