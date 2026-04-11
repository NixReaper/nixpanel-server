import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { readFile } from 'fs/promises'
import { readdir } from 'fs/promises'
import path from 'path'

export default async function webserverRoutes(fastify: FastifyInstance) {
  // GET /api/nixserver/webserver/status
  fastify.get('/status', { preHandler: [requireAdmin] }, async (request, reply) => {
    const [apache, fpm82, fpm83] = await Promise.all([
      exec('systemctl', ['is-active', 'apache2']),
      exec('systemctl', ['is-active', 'php8.2-fpm']),
      exec('systemctl', ['is-active', 'php8.3-fpm']),
    ])
    return reply.send({
      success: true,
      data: {
        apache: { active: apache.stdout.trim() === 'active' },
        php82fpm: { active: fpm82.stdout.trim() === 'active' },
        php83fpm: { active: fpm83.stdout.trim() === 'active' },
      },
    })
  })

  // GET /api/nixserver/webserver/vhosts
  fastify.get('/vhosts', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const files = await readdir('/etc/apache2/sites-enabled')
      const vhosts = files
        .filter(f => f.endsWith('.conf'))
        .map(f => ({
          path: `/etc/apache2/sites-enabled/${f}`,
          domain: f.replace('.conf', ''),
        }))
      return reply.send({ success: true, data: vhosts })
    } catch {
      return reply.send({ success: true, data: [] })
    }
  })

  // GET /api/nixserver/webserver/vhosts/:domain
  fastify.get('/vhosts/:domain', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { domain } = request.params as { domain: string }
    if (domain.includes('/') || domain.includes('..')) {
      return reply.code(400).send({ success: false, error: 'Invalid domain' })
    }
    try {
      const content = await readFile(`/etc/apache2/sites-available/${domain}.conf`, 'utf8')
      return reply.send({ success: true, data: { domain, config: content } })
    } catch {
      return reply.code(404).send({ success: false, error: 'Vhost not found' })
    }
  })

  // POST /api/nixserver/webserver/apache/test
  fastify.post('/apache/test', { preHandler: [requireAdmin] }, async (request, reply) => {
    const result = await exec('apache2ctl', ['configtest'])
    return reply.send({
      success: result.exitCode === 0,
      data: { output: result.stdout + result.stderr },
    })
  })

  // POST /api/nixserver/webserver/apache/reload
  fastify.post('/apache/reload', { preHandler: [requireAdmin] }, async (request, reply) => {
    const test = await exec('apache2ctl', ['configtest'])
    if (test.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Config test failed: ${test.stderr}` })
    }
    const result = await exec('systemctl', ['reload', 'apache2'])
    return reply.send({ success: result.exitCode === 0, data: { output: result.stdout } })
  })

  // POST /api/nixserver/webserver/fpm/reload
  fastify.post('/fpm/reload', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { version } = (request.body ?? {}) as { version?: string }
    const service = version === '8.2' ? 'php8.2-fpm' : 'php8.3-fpm'
    const result = await exec('systemctl', ['reload', service])
    return reply.send({ success: result.exitCode === 0, data: { output: result.stdout } })
  })

  // GET /api/nixserver/webserver/logs/:type — access or error log (last 200 lines)
  fastify.get('/logs/:type', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { type } = request.params as { type: string }
    const logFile = type === 'error'
      ? '/var/log/apache2/error.log'
      : '/var/log/apache2/access.log'
    const result = await exec('tail', ['-n', '200', logFile])
    return reply.send({ success: true, data: { lines: result.stdout.split('\n').filter(Boolean) } })
  })

  // GET /api/nixserver/webserver/accounts/:username/logs/:type — per-account Apache logs
  fastify.get('/accounts/:username/logs/:type', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { username, type } = request.params as { username: string; type: string }
    // Validate username — only alphanum, dash, underscore allowed
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return reply.code(400).send({ success: false, error: 'Invalid username' })
    }
    const logFile = type === 'error'
      ? path.join('/home', username, 'logs', 'error.log')
      : path.join('/home', username, 'logs', 'access.log')
    const result = await exec('tail', ['-n', '200', logFile])
    return reply.send({ success: true, data: { lines: result.stdout.split('\n').filter(Boolean) } })
  })
}
