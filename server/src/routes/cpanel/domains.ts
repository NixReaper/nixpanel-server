import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../db/client.js'
import { requireAuth } from '../../middleware/auth.js'
import { validateDomain, exec } from '../../core/exec.js'
import { enableVhost } from '../../core/nginx.js'

export default async function domainRoutes(fastify: FastifyInstance) {
  const preHandler = [requireAuth]

  // ─── Subdomains ──────────────────────────────────────────────────────────────

  fastify.get('/subdomains', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)
    const subdomains = await prisma.subdomain.findMany({ where: { accountId }, orderBy: { fqdn: 'asc' } })
    return reply.send({ success: true, data: subdomains })
  })

  fastify.post('/subdomains', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, number>).accountId

    const body = z.object({
      subdomain: z.string().min(1).max(63).regex(/^[a-zA-Z0-9-]+$/),
      documentRoot: z.string().optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    // Check quota
    const pkg = account.packageId ? await prisma.package.findUnique({ where: { id: account.packageId } }) : null
    if (pkg && pkg.maxSubdomains > 0) {
      const count = await prisma.subdomain.count({ where: { accountId } })
      if (count >= pkg.maxSubdomains) return reply.code(429).send({ success: false, error: 'Subdomain limit reached' })
    }

    const fqdn = `${body.data.subdomain}.${account.domain}`
    const existing = await prisma.subdomain.findUnique({ where: { fqdn } })
    if (existing) return reply.code(409).send({ success: false, error: 'Subdomain already exists' })

    const docRoot = body.data.documentRoot ?? `${account.homedir}/public_html/${body.data.subdomain}`

    // Create doc root
    await exec('mkdir', ['-p', docRoot])
    await exec('chown', [`${account.username}:${account.username}`, docRoot])

    // Create nginx vhost for subdomain
    try {
      await enableVhost({ domain: fqdn, username: account.username, documentRoot: docRoot })
    } catch (e) {
      console.warn(`Nginx vhost for subdomain ${fqdn} failed:`, e)
    }

    const subdomain = await prisma.subdomain.create({
      data: { subdomain: body.data.subdomain, domain: account.domain, fqdn, documentRoot: docRoot, accountId },
    })
    return reply.code(201).send({ success: true, data: subdomain })
  })

  fastify.delete('/subdomains/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const subdomain = await prisma.subdomain.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!subdomain) return reply.code(404).send({ success: false, error: 'Subdomain not found' })

    const { disableVhost } = await import('../../core/nginx.js')
    try { await disableVhost(subdomain.fqdn) } catch {}

    await prisma.subdomain.delete({ where: { id: subdomain.id } })
    return reply.send({ success: true, data: { message: 'Subdomain deleted' } })
  })

  // ─── Addon Domains ───────────────────────────────────────────────────────────

  fastify.get('/addon', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)
    const domains = await prisma.addonDomain.findMany({ where: { accountId }, orderBy: { domain: 'asc' } })
    return reply.send({ success: true, data: domains })
  })

  fastify.post('/addon', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, number>).accountId

    const body = z.object({
      domain: z.string(),
      subdomain: z.string().optional(),
    }).safeParse(request.body)

    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    if (!validateDomain(body.data.domain)) return reply.code(400).send({ success: false, error: 'Invalid domain' })

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const existing = await prisma.addonDomain.findUnique({ where: { domain: body.data.domain } })
    if (existing) return reply.code(409).send({ success: false, error: 'Addon domain already exists' })

    const subdomain = body.data.subdomain ?? body.data.domain.replace(/\./g, '_')
    const docRoot = `${account.homedir}/public_html/${subdomain}`

    await exec('mkdir', ['-p', docRoot])
    await exec('chown', [`${account.username}:${account.username}`, docRoot])

    try {
      await enableVhost({ domain: body.data.domain, username: account.username, documentRoot: docRoot })
    } catch (e) {
      console.warn(`Nginx vhost for addon domain ${body.data.domain} failed:`, e)
    }

    const addon = await prisma.addonDomain.create({
      data: { domain: body.data.domain, subdomain, documentRoot: docRoot, accountId },
    })
    return reply.code(201).send({ success: true, data: addon })
  })

  fastify.delete('/addon/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const addon = await prisma.addonDomain.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!addon) return reply.code(404).send({ success: false, error: 'Addon domain not found' })

    const { disableVhost } = await import('../../core/nginx.js')
    try { await disableVhost(addon.domain) } catch {}

    await prisma.addonDomain.delete({ where: { id: addon.id } })
    return reply.send({ success: true, data: { message: 'Addon domain deleted' } })
  })

  // ─── Parked Domains ──────────────────────────────────────────────────────────

  fastify.get('/parked', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : parseInt((request.query as Record<string, string>).accountId ?? '0', 10)
    const domains = await prisma.parkedDomain.findMany({ where: { accountId }, orderBy: { domain: 'asc' } })
    return reply.send({ success: true, data: domains })
  })

  fastify.post('/parked', { preHandler }, async (request, reply) => {
    const user = request.user!
    const accountId = user.role === 'user' ? user.sub : (request.body as Record<string, number>).accountId

    const body = z.object({ domain: z.string() }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.issues[0]?.message })
    if (!validateDomain(body.data.domain)) return reply.code(400).send({ success: false, error: 'Invalid domain' })

    const account = await prisma.account.findUnique({ where: { id: accountId } })
    if (!account) return reply.code(404).send({ success: false, error: 'Account not found' })

    const existing = await prisma.parkedDomain.findUnique({ where: { domain: body.data.domain } })
    if (existing) return reply.code(409).send({ success: false, error: 'Parked domain already exists' })

    // Parked domains point to main public_html
    try {
      await enableVhost({
        domain: body.data.domain,
        username: account.username,
        documentRoot: `${account.homedir}/public_html`,
        aliases: [account.domain],
      })
    } catch (e) {
      console.warn(`Nginx vhost for parked domain ${body.data.domain} failed:`, e)
    }

    const parked = await prisma.parkedDomain.create({
      data: { domain: body.data.domain, accountId },
    })
    return reply.code(201).send({ success: true, data: parked })
  })

  fastify.delete('/parked/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const parked = await prisma.parkedDomain.findFirst({
      where: { id: parseInt(id, 10), ...(user.role === 'user' ? { accountId: user.sub } : {}) },
    })
    if (!parked) return reply.code(404).send({ success: false, error: 'Parked domain not found' })

    const { disableVhost } = await import('../../core/nginx.js')
    try { await disableVhost(parked.domain) } catch {}

    await prisma.parkedDomain.delete({ where: { id: parked.id } })
    return reply.send({ success: true, data: { message: 'Parked domain deleted' } })
  })
}
