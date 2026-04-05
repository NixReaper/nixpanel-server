import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAdmin } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { writeFile } from '../../core/exec.js'

const SUPPORTED_PHP_VERSIONS = ['7.4', '8.0', '8.1', '8.2', '8.3']

export default async function phpRoutes(fastify: FastifyInstance) {
  // GET /api/whm/php/versions — list installed PHP versions
  fastify.get('/versions', { preHandler: [requireAdmin] }, async (request, reply) => {
    const versions: { version: string; installed: boolean; active: boolean }[] = []

    for (const v of SUPPORTED_PHP_VERSIONS) {
      const result = await exec('php' + v, ['--version'])
      const installed = result.exitCode === 0
      versions.push({ version: v, installed, active: installed })
    }

    return reply.send({ success: true, data: versions })
  })

  // GET /api/whm/php/accounts — list which PHP version each account uses
  fastify.get('/accounts', { preHandler: [requireAdmin] }, async (request, reply) => {
    const accounts = await prisma.account.findMany({
      where: { status: 'active' },
      select: {
        id: true, username: true, domain: true,
        package: { select: { phpVersion: true } },
      },
    })
    return reply.send({ success: true, data: accounts })
  })

  // PUT /api/whm/php/accounts/:id — change PHP version for account
  fastify.put('/accounts/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z.object({
      phpVersion: z.enum(['7.4', '8.0', '8.1', '8.2', '8.3']),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: 'Invalid PHP version' })
    }

    const account = await prisma.account.findUnique({ where: { id: parseInt(id, 10) } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Create PHP-FPM pool config for this account
    const phpFpmConf = `/etc/php/${body.data.phpVersion}/fpm/pool.d/${account.username}.conf`
    const poolConfig = `[${account.username}]
user = ${account.username}
group = ${account.username}
listen = /run/php/php${body.data.phpVersion}-fpm-${account.username}.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
chdir = /
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen
php_admin_value[open_basedir] = ${account.homedir}:/tmp
php_admin_value[error_log] = ${account.homedir}/logs/php_errors.log
`

    await writeFile(phpFpmConf, poolConfig)

    const phpVersion = body.data.phpVersion
    await exec('systemctl', [`php${phpVersion}-fpm`, 'reload'])

    // Update package if account has one
    if (account.packageId) {
      await prisma.package.update({
        where: { id: account.packageId },
        data: { phpVersion: body.data.phpVersion },
      })
    }

    return reply.send({ success: true, data: { message: `PHP version set to ${body.data.phpVersion}` } })
  })

  // GET /api/whm/php/ini/:version — get php.ini settings
  fastify.get('/ini/:version', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { version } = request.params as { version: string }
    if (!SUPPORTED_PHP_VERSIONS.includes(version)) {
      return reply.code(400).send({ success: false, error: 'Unsupported PHP version' })
    }

    const result = await exec(`php${version}`, ['-i'])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: 'Failed to get PHP info' })
    }

    // Parse key settings
    const lines = result.stdout.split('\n')
    const settings: Record<string, string> = {}
    for (const line of lines) {
      const match = line.match(/^([^=>]+)=>\s*(.+?)\s*$/)
      if (match) settings[match[1].trim()] = match[2].trim()
    }

    const relevant = [
      'memory_limit', 'max_execution_time', 'max_input_time', 'upload_max_filesize',
      'post_max_size', 'display_errors', 'error_reporting', 'date.timezone',
    ]
    const filtered: Record<string, string> = {}
    for (const key of relevant) {
      if (settings[key]) filtered[key] = settings[key]
    }

    return reply.send({ success: true, data: { version, settings: filtered } })
  })
}
