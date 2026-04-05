import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import path from 'path'
import prisma from '../../db/client.js'
import { requireAdminOrReseller } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'
import { enableVhost } from '../../core/nginx.js'
import { config } from '../../config.js'

export default async function sslRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAdminOrReseller]

  // GET /api/whm/ssl
  fastify.get('/', { preHandler }, async (request, reply) => {
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = {}
    if (q.accountId) where.accountId = parseInt(q.accountId, 10)
    if (q.status) where.status = q.status

    const certs = await prisma.sslCertificate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { account: { select: { username: true, domain: true } } },
    })
    return reply.send({ success: true, data: certs })
  })

  // POST /api/whm/ssl/issue — issue Let's Encrypt cert via certbot
  fastify.post('/issue', { preHandler }, async (request, reply) => {
    const body = z.object({
      accountId: z.number().int().positive(),
      domain: z.string(),
      includeWww: z.boolean().default(true),
      autoRenew: z.boolean().default(true),
    }).safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    }

    const { accountId, domain, includeWww, autoRenew } = body.data

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const domains = [domain]
    if (includeWww) domains.push(`www.${domain}`)

    const certbotArgs = [
      'certonly', '--webroot',
      '-w', config.paths.certbotWebroot,
      '--non-interactive',
      '--agree-tos',
      '--email', account.email,
      ...domains.flatMap(d => ['-d', d]),
    ]

    const result = await exec('certbot', certbotArgs)
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `certbot failed: ${result.stderr}` })
    }

    const certDir = `/etc/letsencrypt/live/${domain}`
    const certPath = `${certDir}/fullchain.pem`
    const keyPath = `${certDir}/privkey.pem`
    const chainPath = `${certDir}/chain.pem`

    const issuedAt = new Date()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const existing = await prisma.sslCertificate.findFirst({ where: { accountId, domain } })
    let cert
    if (existing) {
      cert = await prisma.sslCertificate.update({
        where: { id: existing.id },
        data: { certPath, keyPath, chainPath, issuedAt, expiresAt, status: 'active', autoRenew },
      })
    } else {
      cert = await prisma.sslCertificate.create({
        data: { accountId, domain, certPath, keyPath, chainPath, issuedAt, expiresAt, status: 'active', autoRenew },
      })
    }

    // Update nginx vhost with SSL
    try {
      await enableVhost({
        domain,
        username: account.username,
        documentRoot: `${account.homedir}/public_html`,
        sslEnabled: true,
        certPath,
        keyPath,
        chainPath,
      })
    } catch (e) {
      console.warn(`Nginx SSL update failed for ${domain}:`, e)
    }

    return reply.send({ success: true, data: cert })
  })

  // POST /api/whm/ssl/revoke
  fastify.post('/:id/revoke', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cert = await prisma.sslCertificate.findUnique({ where: { id: parseInt(id, 10) } })
    if (!cert) return reply.code(404).send({ success: false, error: 'Certificate not found' })

    if (cert.certPath) {
      const result = await exec('certbot', ['revoke', '--cert-path', cert.certPath, '--non-interactive'])
      if (result.exitCode !== 0) {
        console.warn(`certbot revoke warning: ${result.stderr}`)
      }
    }

    await prisma.sslCertificate.update({
      where: { id: cert.id },
      data: { status: 'revoked' },
    })

    return reply.send({ success: true, data: { message: 'Certificate revoked' } })
  })

  // POST /api/whm/ssl/:id/renew
  fastify.post('/:id/renew', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cert = await prisma.sslCertificate.findUnique({ where: { id: parseInt(id, 10) } })
    if (!cert) return reply.code(404).send({ success: false, error: 'Certificate not found' })

    const result = await exec('certbot', ['renew', '--cert-name', cert.domain, '--non-interactive'])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Renewal failed: ${result.stderr}` })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    await prisma.sslCertificate.update({
      where: { id: cert.id },
      data: { status: 'active', issuedAt: new Date(), expiresAt },
    })

    return reply.send({ success: true, data: { message: 'Certificate renewed' } })
  })
}
