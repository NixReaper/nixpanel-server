import 'dotenv/config'
import { buildApp } from './app.js'
import { config } from './config.js'
import prisma from './db/client.js'
import { startScheduler, stopScheduler } from './scheduler.js'

async function start() {
  let app

  try {
    await prisma.$connect()
    console.log('[nixpanel] Database connected')

    app = await buildApp()

    await app.listen({ port: config.server.port, host: config.server.host })
    console.log(`[nixpanel] API running on ${config.server.host}:${config.server.port}`)

    startScheduler()

  } catch (err) {
    console.error('[nixpanel] Failed to start:', err)
    await prisma.$disconnect()
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    console.log(`[nixpanel] ${signal} received, shutting down...`)
    await app?.close()
    await stopScheduler()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
