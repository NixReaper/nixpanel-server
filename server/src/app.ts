import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import websocket from '@fastify/websocket'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from './config.js'
import authRoutes from './routes/auth/index.js'
import nixserverRoutes from './routes/nixserver/index.js'
import nixclientRoutes from './routes/nixclient/index.js'
import { getSystemStats } from './core/system.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn',
      transport: config.isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  })

  // ─── Security ────────────────────────────────────────────────────────────────

  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })

  await fastify.register(cors, {
    origin: config.isDev
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:2087', 'http://localhost:2083']
      : false,
    credentials: true,
  })

  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    keyGenerator: req => req.ip,
  })

  // ─── JWT ─────────────────────────────────────────────────────────────────────

  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
  })

  // ─── WebSocket ───────────────────────────────────────────────────────────────

  await fastify.register(websocket)

  // ─── Static files ────────────────────────────────────────────────────────────

  // NixServer frontend
  const whmDist = path.resolve(__dirname, '../../nixserver/dist')
  const cpanelDist = path.resolve(__dirname, '../../nixclient/dist')

  // ─── API Routes ──────────────────────────────────────────────────────────────

  fastify.register(authRoutes, { prefix: '/api/auth' })
  fastify.register(nixserverRoutes, { prefix: '/api/nixserver' })
  fastify.register(nixclientRoutes, { prefix: '/api/nixclient' })

  // ─── Health check ─────────────────────────────────────────────────────────────

  fastify.get('/api/health', async () => ({
    status: 'ok',
    version: '0.3.1',
    timestamp: new Date().toISOString(),
  }))

  // ─── WebSocket: real-time stats ───────────────────────────────────────────────

  fastify.get('/ws/stats', { websocket: true }, (socket, request) => {
    let interval: ReturnType<typeof setInterval> | null = null

    // Verify JWT on connection
    const token = (request.query as Record<string, string>).token
    if (!token) {
      socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
      socket.close()
      return
    }

    try {
      fastify.jwt.verify(token)
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid token' }))
      socket.close()
      return
    }

    const send = async () => {
      if (socket.readyState !== 1) return
      const stats = await getSystemStats()
      socket.send(JSON.stringify({ type: 'stats', data: stats }))
    }

    send()
    interval = setInterval(send, config.features.wsStatsInterval)

    socket.on('close', () => {
      if (interval) clearInterval(interval)
    })
  })

  // ─── SPA fallback ────────────────────────────────────────────────────────────

  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/ws/')) {
      return reply.code(404).send({ success: false, error: 'Not found' })
    }
    // Serve SPA index.html for all other routes
    reply.code(200).type('text/html').send('<h1>NixPanel</h1>')
  })

  return fastify
}
