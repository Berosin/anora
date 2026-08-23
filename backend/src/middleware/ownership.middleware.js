import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

/**
 * Loads a document by :param from `Model` and attaches it to `req[attachAs]`,
 * but only if its `userId` matches the authenticated user. Ownership is
 * enforced at the query level (not just checked after the fact), so a
 * user can never even detect whether another user's resource exists.
 */
export function requireOwnership(Model, { param = 'id', attachAs = 'resource' } = {}) {
  return asyncHandler(async (req, _res, next) => {
    const resource = await Model.findOne({ _id: req.params[param], userId: req.user._id })
    if (!resource) {
      throw ApiError.notFound('Resource not found.')
    }
    req[attachAs] = resource
    next()
  })
}
