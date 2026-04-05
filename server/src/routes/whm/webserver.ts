import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { readFile } from 'fs/promises'

export default async function webserverRoutes(fastify: FastifyInstance) {
  // GET /api/whm/webserver/status
  fastify.get('/status', { preHandler: [requireAdmin] }, async (request, reply) => {
    const [nginx, apache] = await Promise.all([
      exec('systemctl', ['is-active', 'nginx']),
      exec('systemctl', ['is-active', 'apache2']),
    ])
    return reply.send({
      success: true,
      data: {
        nginx: { active: nginx.stdout.trim() === 'active' },
        apache: { active: apache.stdout.trim() === 'active' },
      },
    })
  })

  // GET /api/whm/webserver/vhosts
  fastify.get('/vhosts', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('find', ['/etc/nginx/sites-enabled', '-name', '*.conf', '-type', 'f'])
    const files = result.stdout.split('\n').filter(Boolean)
    const vhosts = files.map(f => ({
      path: f,
      domain: f.split('/').pop()?.replace('.conf', '') ?? '',
    }))
    return reply.send({ success: true, data: vhosts })
  })

  // GET /api/whm/webserver/vhosts/:domain
  fastify.get('/vhosts/:domain', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { domain } = request.params as { domain: string }
    if (domain.includes('/') || domain.includes('..')) {
      return reply.code(400).send({ success: false, error: 'Invalid domain' })
    }
    try {
      const content = await readFile(`/etc/nginx/sites-available/${domain}.conf`, 'utf8')
      return reply.send({ success: true, data: { domain, config: content } })
    } catch {
      return reply.code(404).send({ success: false, error: 'Vhost not found' })
    }
  })

  // POST /api/whm/webserver/nginx/test
  fastify.post('/nginx/test', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('nginx', ['-t'])
    return reply.send({
      success: result.exitCode === 0,
      data: { output: result.stdout + result.stderr },
    })
  })

  // POST /api/whm/webserver/nginx/reload
  fastify.post('/nginx/reload', { preHandler: [requireAdmin] }, async (request, reply) => {
    const test = await exec('nginx', ['-t'])
    if (test.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Config test failed: ${test.stderr}` })
    }
    const result = await exec('systemctl', ['reload', 'nginx'])
    return reply.send({ success: result.exitCode === 0, data: { output: result.stdout } })
  })

  // GET /api/whm/webserver/logs/:type — access or error log (last 200 lines)
  fastify.get('/logs/:type', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { type } = request.params as { type: string }
    const logFile = type === 'error' ? '/var/log/nginx/error.log' : '/var/log/nginx/access.log'
    const result = await exec('tail', ['-n', '200', logFile])
    return reply.send({ success: true, data: { lines: result.stdout.split('\n').filter(Boolean) } })
  })
}
