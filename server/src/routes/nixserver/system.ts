import type { FastifyInstance } from 'fastify'
import { spawn } from 'child_process'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'
import { getSystemStats } from '../../core/system.js'
import { exec } from '../../core/exec.js'
import { readFile } from 'fs/promises'

const INSTALL_DIR = process.env.INSTALL_DIR ?? '/opt/nixpanel'

export default async function systemRoutes(fastify: FastifyInstance) {
  // GET /api/nixserver/system/stats
  fastify.get('/stats', { preHandler: [requireAdmin] }, async (request, reply) => {
    const stats = await getSystemStats()
    return reply.send({ success: true, data: stats })
  })

  // GET /api/nixserver/system/info
  fastify.get('/info', { preHandler: [requireAdmin] }, async (request, reply) => {
    const [hostname, osRelease, kernel, uptime] = await Promise.all([
      exec('hostname', ['-f']),
      readFile('/etc/os-release', 'utf8').catch(() => ''),
      exec('uname', ['-r']),
      exec('uptime', ['-p']),
    ])

    const osInfo: Record<string, string> = {}
    for (const line of osRelease.split('\n')) {
      const [k, v] = line.split('=')
      if (k && v) osInfo[k] = v.replace(/"/g, '')
    }

    return reply.send({
      success: true,
      data: {
        hostname: hostname.stdout,
        os: osInfo['PRETTY_NAME'] ?? 'Unknown',
        osId: osInfo['ID'] ?? 'unknown',
        kernel: kernel.stdout,
        uptime: uptime.stdout,
      },
    })
  })

  // GET /api/nixserver/system/processes
  fastify.get('/processes', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('ps', ['aux', '--sort=-%cpu'])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: 'Failed to get process list' })
    }

    const lines = result.stdout.split('\n').slice(1, 51) // top 50 processes
    const processes = lines.map(line => {
      const parts = line.trim().split(/\s+/)
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        command: parts.slice(10).join(' '),
      }
    }).filter(p => p.pid)

    return reply.send({ success: true, data: processes })
  })

  // POST /api/nixserver/system/processes/:pid/kill
  fastify.post('/processes/:pid/kill', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { pid } = request.params as { pid: string }
    if (!/^\d+$/.test(pid) || parseInt(pid, 10) <= 1) {
      return reply.code(400).send({ success: false, error: 'Invalid PID' })
    }
    const result = await exec('kill', ['-9', pid])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: result.stderr })
    }
    return reply.send({ success: true, data: { message: `Process ${pid} killed` } })
  })

  // GET /api/nixserver/system/audit-log
  fastify.get('/audit-log', { preHandler: [requireAdmin] }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const page = Math.max(1, parseInt(q.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit ?? '50', 10)))

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { username: true } } },
      }),
      prisma.auditLog.count(),
    ])

    return reply.send({
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  })

  // GET /api/nixserver/system/settings
  fastify.get('/settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value
    return reply.send({ success: true, data: map })
  })

  // PUT /api/nixserver/system/settings
  fastify.put('/settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = request.body as Record<string, string>
    if (typeof body !== 'object' || Array.isArray(body)) {
      return reply.code(400).send({ success: false, error: 'Body must be a key-value object' })
    }

    for (const [key, value] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }

    return reply.send({ success: true, data: { message: 'Settings updated' } })
  })

  // GET /api/nixserver/system/version
  // Returns the installed version and checks GitHub for the latest available version.
  fastify.get('/version', { preHandler: [requireAdmin] }, async (_request, reply) => {
    // Read installed version from package.json
    let currentVersion = '0.0.0'
    try {
      const pkg = JSON.parse(await readFile(`${INSTALL_DIR}/package.json`, 'utf8'))
      currentVersion = pkg.version ?? '0.0.0'
    } catch { /* running in dev or non-standard path */ }

    // Check GitHub for latest version (5 s timeout, non-fatal)
    let latestVersion: string | null = null
    try {
      const resp = await fetch(
        'https://raw.githubusercontent.com/NixReaper/nixpanel-server/main/package.json',
        { signal: AbortSignal.timeout(5_000) }
      )
      if (resp.ok) {
        const json = await resp.json() as { version?: string }
        latestVersion = json.version ?? null
      }
    } catch { /* offline or rate-limited */ }

    return reply.send({
      success: true,
      data: {
        currentVersion,
        latestVersion,
        updateAvailable: latestVersion !== null && latestVersion !== currentVersion,
      },
    })
  })

  // POST /api/nixserver/system/upgrade
  // Fires the update script in the background and returns immediately.
  // The service will restart ~60 s later once the build finishes.
  fastify.post('/upgrade', { preHandler: [requireAdmin] }, async (_request, reply) => {
    reply.send({
      success: true,
      data: { message: 'Upgrade started. The panel will be back online in about 60 seconds.' },
    })

    // Delay slightly to ensure the HTTP response is flushed before the service restarts
    setTimeout(() => {
      const child = spawn('bash', [`${INSTALL_DIR}/scripts/update.sh`], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
    }, 800)
  })
}
