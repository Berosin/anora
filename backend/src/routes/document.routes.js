import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadMiddleware, handleUploadErrors } from '../middleware/upload.middleware.js'
import {
  uploadDocument,
  listDocuments,
  getDocument,
  getDocumentStatus,
  deleteDocument,
  downloadDocumentFile,
} from '../controllers/document.controller.js'

const router = Router()
router.use(requireAuth)

router.post('/upload', uploadMiddleware, handleUploadErrors, uploadDocument)
router.get('/', listDocuments)
router.get('/file/:storageKey', downloadDocumentFile)
router.get('/:id', getDocument)
router.get('/:id/status', getDocumentStatus)
router.delete('/:id', deleteDocument)

export default router
