import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import apiRoutes from './routes/index.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimiters.js'
import { logger } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  // morgan logs request lines only (method, path, status, timing) — never
  // headers or bodies, so tokens/passwords never end up in logs.
  app.use(
    morgan('dev', {
      stream: { write: (line) => logger.info(line.trim()) },
      skip: () => env.nodeEnv === 'test',
    })
  )

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'anora-backend', timestamp: new Date().toISOString() })
  })

  app.use('/api', apiLimiter, apiRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
