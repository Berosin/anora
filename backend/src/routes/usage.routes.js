import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { Usage } from '../models/Usage.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth)

// This one IS real — Usage documents are created at registration
// (see auth.controller.js), so the dashboard has honest zero-state
// numbers to show from day one instead of a stub.
router.get('/summary', asyncHandler(async (req, res) => {
  const usage = await Usage.findOne({ userId: req.user._id })
  res.json({
    usage: usage || {
      documentsProcessed: 0,
      questionsAsked: 0,
      storageUsedBytes: 0,
    },
  })
}))

export default router
