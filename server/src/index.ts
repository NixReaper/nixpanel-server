import 'dotenv/config'
import { buildApp } from './app.js'
import { config } from './config.js'
import prisma from './db/client.js'

async function start() {
  let app

  try {
    // Verify DB connection
    await prisma.$connect()
    console.log('Database connected')

    app = await buildApp()

    // NixServer on port 2087
    await app.listen({ port: config.server.nixserverPort, host: config.server.host })
    console.log(`NixServer running on port ${config.server.nixserverPort}`)
    console.log(`NixClient API running on port ${config.server.nixserverPort} (/api/cpanel)`)

  } catch (err) {
    console.error('Failed to start server:', err)
    await prisma.$disconnect()
    process.exit(1)
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down...`)
    await app?.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
