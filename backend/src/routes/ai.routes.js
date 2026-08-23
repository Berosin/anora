import { Router } from 'express'
import { body } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.js'
import { summarize, compare } from '../controllers/ai.controller.js'

const router = Router()
router.use(requireAuth)

router.post(
  '/summarize',
  [body('documentId').notEmpty().withMessage('documentId is required.')],
  validate,
  summarize
)

router.post(
  '/compare',
  [
    body('documentIdA').notEmpty().withMessage('documentIdA is required.'),
    body('documentIdB').notEmpty().withMessage('documentIdB is required.'),
  ],
  validate,
  compare
)

export default router
