import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import path from 'path'
import { stat, readdir, unlink, rename, mkdir } from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { requireAuth } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { config } from '../../config.js'
import prisma from '../../db/client.js'

/**
 * Resolve a user path, enforcing it stays inside their home directory.
 */
function resolveUserPath(homedir: string, userPath: string): string {
  const resolved = path.resolve(homedir, userPath.replace(/^\//, ''))
  if (!resolved.startsWith(homedir + path.sep) && resolved !== homedir) {
    throw new Error('Path traversal detected')
  }
  return resolved
}

async function getAccount(fastify: FastifyInstance, userId: number) {
  return prisma.account.findUnique({ where: { id: userId } })
}

export default async function fileRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/cpanel/files?path=
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const q = request.query as Record<string, string>
    const userPath = q.path ?? '/'

    let targetPath: string
    try {
      targetPath = resolveUserPath(account.homedir, userPath)
    } catch {
      return reply.code(400).send({ success: false, error: 'Invalid path' })
    }

    const entries = await readdir(targetPath, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async entry => {
        const fullPath = path.join(targetPath, entry.name)
        let size = 0
        let mtime = new Date()
        try {
          const s = await stat(fullPath)
          size = s.size
          mtime = s.mtime
        } catch {}
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          size,
          mtime,
          path: path.join(userPath, entry.name),
        }
      })
    )

    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return reply.send({ success: true, data: { path: userPath, files } })
  })

  // GET /api/cpanel/files/content?path=
  fastify.get('/content', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const q = request.query as Record<string, string>
    let targetPath: string
    try {
      targetPath = resolveUserPath(account.homedir, q.path ?? '')
    } catch {
      return reply.code(400).send({ success: false, error: 'Invalid path' })
    }

    const fileStat = await stat(targetPath)
    if (fileStat.isDirectory()) {
      return reply.code(400).send({ success: false, error: 'Path is a directory' })
    }
    if (fileStat.size > 5 * 1024 * 1024) {
      return reply.code(413).send({ success: false, error: 'File too large to edit (max 5MB)' })
    }

    const { readFile } = await import('fs/promises')
    const content = await readFile(targetPath, 'utf8')
    return reply.send({ success: true, data: { path: q.path, content } })
  })

  // PUT /api/cpanel/files/content — save file content
  fastify.put('/content', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({
      path: z.string(),
      content: z.string(),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    let targetPath: string
    try {
      targetPath = resolveUserPath(account.homedir, body.data.path)
    } catch {
      return reply.code(400).send({ success: false, error: 'Invalid path' })
    }

    const { writeFile } = await import('fs/promises')
    await writeFile(targetPath, body.data.content, 'utf8')
    await exec('chown', [`${account.username}:${account.username}`, targetPath])

    return reply.send({ success: true, data: { message: 'File saved' } })
  })

  // POST /api/cpanel/files/mkdir
  fastify.post('/mkdir', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({ path: z.string() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'path required' })

    let targetPath: string
    try {
      targetPath = resolveUserPath(account.homedir, body.data.path)
    } catch {
      return reply.code(400).send({ success: false, error: 'Invalid path' })
    }

    await mkdir(targetPath, { recursive: true })
    await exec('chown', [`${account.username}:${account.username}`, targetPath])

    return reply.send({ success: true, data: { message: 'Directory created' } })
  })

  // DELETE /api/cpanel/files
  fastify.delete('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({ paths: z.array(z.string()).min(1).max(50) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: 'paths[] required' })

    const deleted: string[] = []
    const errors: { path: string; error: string }[] = []

    for (const p of body.data.paths) {
      try {
        const targetPath = resolveUserPath(account.homedir, p)
        const s = await stat(targetPath)
        if (s.isDirectory()) {
          await exec('rm', ['-rf', targetPath])
        } else {
          await unlink(targetPath)
        }
        deleted.push(p)
      } catch (e) {
        errors.push({ path: p, error: String(e) })
      }
    }

    return reply.send({ success: true, data: { deleted, errors } })
  })

  // POST /api/cpanel/files/rename
  fastify.post('/rename', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({ from: z.string(), to: z.string() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const fromPath = resolveUserPath(account.homedir, body.data.from)
    const toPath = resolveUserPath(account.homedir, body.data.to)

    await rename(fromPath, toPath)
    return reply.send({ success: true, data: { message: 'Renamed' } })
  })

  // POST /api/cpanel/files/chmod
  fastify.post('/chmod', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({
      path: z.string(),
      mode: z.string().regex(/^[0-7]{3,4}$/),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const targetPath = resolveUserPath(account.homedir, body.data.path)
    await exec('chmod', [body.data.mode, targetPath])

    return reply.send({ success: true, data: { message: 'Permissions updated' } })
  })

  // POST /api/cpanel/files/compress — zip files
  fastify.post('/compress', { preHandler }, async (request, reply) => {
    const user = request.user!
    if (user.role !== 'user') return reply.code(403).send({ success: false, error: 'cPanel users only' })

    const account = await getAccount(fastify, user.sub)
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const body = z.object({
      paths: z.array(z.string()).min(1),
      dest: z.string(),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const destPath = resolveUserPath(account.homedir, body.data.dest)
    const srcPaths = body.data.paths.map(p => resolveUserPath(account.homedir, p))

    await exec('tar', ['-czf', destPath, ...srcPaths])
    return reply.send({ success: true, data: { message: 'Compressed', dest: body.data.dest } })
  })
}
