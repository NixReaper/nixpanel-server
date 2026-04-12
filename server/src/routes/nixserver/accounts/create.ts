import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../../db/client.js'
import { requireAdminOrReseller } from '../../../middleware/auth.js'
import { exec, validateUsername, validateDomain } from '../../../core/exec.js'
import { enableVhost, enablePhpFpmPool } from '../../../core/apache.js'
import { createZone } from '../../../core/dns.js'
import { config } from '../../../config.js'

const CreateAccountSchema = z.object({
  username:   z.string().min(1).max(32),
  password:   z.string().min(8),
  email:      z.string().email(),
  domain:     z.string().min(4),
  packageId:  z.number().int().positive().optional(),
  resellerId: z.number().int().positive().optional(),
  ipId:       z.number().int().positive().optional(),
})

export default async function createRoute(fastify: FastifyInstance) {
  // POST /api/nixserver/accounts
  fastify.post('/', { preHandler: [requireAdminOrReseller] }, async (request, reply) => {
    const body = CreateAccountSchema.safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const { username, password, email, domain, packageId, resellerId, ipId } = body.data

    if (!validateUsername(username)) {
      return reply.code(400).send({ success: false, error: 'Invalid username format' })
    }
    if (!validateDomain(domain)) {
      return reply.code(400).send({ success: false, error: 'Invalid domain format' })
    }

    const exists = await prisma.account.findFirst({ where: { OR: [{ username }, { domain }] } })
    if (exists) {
      return reply.code(409).send({ success: false, error: 'Username or domain already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const homedir = `${config.paths.homeDir}/${username}`

    const userAdd = await exec('useradd', ['-m', '-d', homedir, '-s', '/usr/sbin/nologin', username])
    if (userAdd.exitCode !== 0 && !config.isDev) {
      return reply.code(500).send({ success: false, error: `Failed to create system user: ${userAdd.stderr}` })
    }

    const dirs = [
      `${homedir}/public_html`,
      `${homedir}/logs`,
      `${homedir}/tmp`,
      `${homedir}/mail`,
      `${homedir}/.ssh`,
    ]
    for (const dir of dirs) await exec('mkdir', ['-p', dir])
    await exec('chown', ['-R', `${username}:${username}`, homedir])
    await exec('chmod', ['750', homedir])
    await exec('chmod', ['755', `${homedir}/public_html`])

    let ipAddress: string | undefined
    if (ipId) {
      const ip = await prisma.ipAddress.findUnique({ where: { id: ipId } })
      ipAddress = ip?.address
    }

    const account = await prisma.account.create({
      data: {
        username, passwordHash, email, domain, homedir,
        status: 'active',
        packageId:  packageId  ?? null,
        resellerId: resellerId ?? (request.user!.role === 'reseller' ? request.user!.sub : null),
        ipId:       ipId       ?? null,
        ipAddress:  ipAddress  ?? null,
      },
    })

    if (ipAddress) {
      try {
        const zoneFile = await createZone({ domain, ip: ipAddress, ns1: `ns1.${domain}`, ns2: `ns2.${domain}` })
        await prisma.dnsZone.create({ data: { domain, zoneFile, accountId: account.id } })
      } catch (e) {
        console.warn(`DNS zone creation failed for ${domain}:`, e)
      }
    }

    const phpVersion = (await prisma.package.findUnique({ where: { id: packageId ?? 0 } }))?.phpVersion ?? '8.3'
    try {
      await enablePhpFpmPool(username, phpVersion)
      await enableVhost({ domain, username, documentRoot: `${homedir}/public_html`, phpVersion })
    } catch (e) {
      console.warn(`Apache/PHP-FPM setup failed for ${domain}:`, e)
    }

    await prisma.auditLog.create({
      data: {
        action: 'account.create',
        target: username,
        details: `Created hosting account for domain ${domain}`,
        sourceIp: request.ip,
        adminId: request.user!.role === 'admin' ? request.user!.sub : null,
      },
    })

    const { passwordHash: _, ...safe } = account
    return reply.code(201).send({ success: true, data: safe })
  })
}
