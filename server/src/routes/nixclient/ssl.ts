import type { FastifyInstance } from 'fastify'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { exec } from '../../core/exec.js'

export default async function sslRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // GET /api/nixclient/ssl — certs for the authenticated user's account only
  fastify.get('/', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.sub

    const certs = await prisma.sslCertificate.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send({ success: true, data: certs })
  })

  // POST /api/nixclient/ssl/:id/renew
  fastify.post('/:id/renew', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const cert = await prisma.sslCertificate.findFirst({
      where: { id: parseInt(id, 10), accountId: user.sub },
    })
    if (!cert) return reply.code(404).send({ success: false, error: 'Certificate not found' })

    const result = await exec('certbot', ['renew', '--cert-name', cert.domain, '--non-interactive'])
    if (result.exitCode !== 0) {
      return reply.code(500).send({ success: false, error: `Renewal failed: ${result.stderr}` })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const updated = await prisma.sslCertificate.update({
      where: { id: cert.id },
      data: { status: 'active', issuedAt: new Date(), expiresAt },
    })

    return reply.send({ success: true, data: updated })
  })
}
