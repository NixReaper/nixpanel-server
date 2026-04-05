import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import path from 'path'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { config } from '../../config.js'

const BACKUP_DIR = '/var/nixpanel/backups'

export default async function backupRoutes(fastify: FastifyInstance) {
  // POST /api/nixserver/backup/account/:id — backup a single account
  fastify.post('/account/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const account = await prisma.account.findUnique({ where: { id: parseInt(id, 10) } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${account.username}-${timestamp}.tar.gz`
    const dest = path.join(BACKUP_DIR, 'accounts', filename)

    // Ensure backup dir exists
    await exec('mkdir', ['-p', path.join(BACKUP_DIR, 'accounts')])

    const result = await exec('tar', [
      '-czf', dest,
      '-C', config.paths.homeDir,
      account.username,
    ])

    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Backup failed: ${result.stderr}` })
    }

    // Get size
    const stat = await exec('du', ['-sb', dest])
    const size = parseInt(stat.stdout.split('\t')[0] ?? '0', 10)

    return reply.send({ success: true, data: { filename, path: dest, size, createdAt: new Date() } })
  })

  // POST /api/nixserver/backup/server — full server backup
  fastify.post('/server', { preHandler: [requireAdmin] }, async (request, reply) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `server-backup-${timestamp}.tar.gz`
    const dest = path.join(BACKUP_DIR, 'server', filename)

    await exec('mkdir', ['-p', path.join(BACKUP_DIR, 'server')])

    const result = await exec('tar', [
      '-czf', dest,
      '--exclude=/proc', '--exclude=/sys', '--exclude=/dev', '--exclude=/run',
      '--exclude=/tmp', '--exclude=/var/nixpanel/backups',
      '/etc', '/home', '/var/www',
    ])

    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Backup failed: ${result.stderr}` })
    }

    return reply.send({ success: true, data: { filename, path: dest, createdAt: new Date() } })
  })

  // GET /api/nixserver/backup/list — list available backups
  fastify.get('/list', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('find', [BACKUP_DIR, '-name', '*.tar.gz', '-printf', '%p %s %T@\n'])
    if (result.exitCode !== 0 && !result.stdout) {
      return reply.send({ success: true, data: [] })
    }

    const backups = result.stdout.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(' ')
      return {
        path: parts[0],
        filename: path.basename(parts[0] ?? ''),
        size: parseInt(parts[1] ?? '0', 10),
        createdAt: new Date(parseFloat(parts[2] ?? '0') * 1000),
      }
    })

    return reply.send({ success: true, data: backups })
  })

  // DELETE /api/nixserver/backup — delete a backup file
  fastify.delete('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = z.object({ path: z.string() }).safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: 'path required' })
    }

    if (!body.data.path.startsWith(BACKUP_DIR)) {
      return reply.code(400).send({ success: false, error: 'Invalid backup path' })
    }

    await exec('rm', ['-f', body.data.path])
    return reply.send({ success: true, data: { message: 'Backup deleted' } })
  })

  // POST /api/nixserver/backup/restore/:filename
  fastify.post('/restore/:filename', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { filename } = request.params as { filename: string }
    // Sanitize — no path traversal
    if (filename.includes('/') || filename.includes('..')) {
      return reply.code(400).send({ success: false, error: 'Invalid filename' })
    }

    const backupPath = path.join(BACKUP_DIR, 'accounts', filename)
    const result = await exec('tar', ['-xzf', backupPath, '-C', config.paths.homeDir])

    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Restore failed: ${result.stderr}` })
    }

    return reply.send({ success: true, data: { message: `Restored from ${filename}` } })
  })
}
