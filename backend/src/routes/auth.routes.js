import { Router } from 'express'
import { body } from 'express-validator'
import { register, login, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.js'
import { authLimiter } from '../middleware/rateLimiters.js'

const router = Router()

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  ],
  validate,
  register
)

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
)

router.get('/me', requireAuth, me)

export default router
