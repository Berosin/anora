import multer from 'multer'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const ALLOWED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(ApiError.badRequest(`Unsupported file type. Allowed: PDF, DOCX, TXT.`))
    return
  }
  cb(null, true)
}

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter,
}).single('file')

export function resolveDocumentType(mimetype) {
  return ALLOWED_MIME_TYPES[mimetype]
}

// Multer's own errors (e.g. LIMIT_FILE_SIZE) don't come through as
// ApiErrors — this middleware, mounted after uploadMiddleware, translates
// them into the same clean error shape as everything else.
export function handleUploadErrors(err, _req, _res, next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    next(ApiError.badRequest(`File is too large. Maximum size is ${env.maxUploadSizeMb}MB.`))
    return
  }
  next(err)
}
