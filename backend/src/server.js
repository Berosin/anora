import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = createApp()

async function start() {
  try {
    await connectDatabase()
  } catch {
    // In local/demo environments without MongoDB configured yet, we still
    // bind the port so /health is reachable and the API structure can be
    // inspected — but every DB-backed route will correctly fail until a
    // real MONGO_URI (e.g. an Atlas connection string) is supplied.
    logger.warn('Starting without a database connection — most routes will return errors until MONGO_URI is set correctly.')
  }

  app.listen(env.port, () => {
    logger.info(`ANORA backend listening on http://localhost:${env.port}`)
  })
}

start()
