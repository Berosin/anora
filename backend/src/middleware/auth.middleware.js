import { verifyToken } from '../utils/token.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Log in to access this resource.')
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please log in again.')
  }

  const user = await User.findById(payload.sub)
  if (!user) {
    throw ApiError.unauthorized('Your session is no longer valid. Please log in again.')
  }

  req.user = user
  next()
})
