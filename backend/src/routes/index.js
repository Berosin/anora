import { Router } from 'express'
import authRoutes from './auth.routes.js'
import knowledgeBaseRoutes from './knowledgeBase.routes.js'
import documentRoutes from './document.routes.js'
import chatRoutes from './chat.routes.js'
import aiRoutes from './ai.routes.js'
import usageRoutes from './usage.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/knowledge-bases', knowledgeBaseRoutes)
router.use('/documents', documentRoutes)
router.use('/chat', chatRoutes)
router.use('/ai', aiRoutes)
router.use('/usage', usageRoutes)

export default router
