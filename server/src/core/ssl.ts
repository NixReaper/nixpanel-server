import prisma from '../db/client.js'
import { exec } from './exec.js'
import { config } from '../config.js'

const RENEW_DAYS_BEFORE_EXPIRY = 30

/**
 * Issue a Let's Encrypt certificate for a domain via certbot Apache plugin.
 */
export async function issueCertificate(domain: string, email: string): Promise<void> {
  const result = await exec('certbot', [
    'certonly',
    '--apache',
    '--non-interactive',
    '--agree-tos',
    '--email', email,
    '-d', domain,
    '-d', `www.${domain}`,
  ], { timeout: 120_000 })

  if (result.exitCode !== 0) {
    throw new Error(`certbot failed for ${domain}: ${result.stderr}`)
  }
}

/**
 * Renew a specific certificate.
 */
export async function renewCertificate(domain: string): Promise<void> {
  const result = await exec('certbot', [
    'renew',
    '--cert-name', domain,
    '--non-interactive',
    '--quiet',
  ], { timeout: 120_000 })

  if (result.exitCode !== 0) {
    throw new Error(`certbot renew failed for ${domain}: ${result.stderr}`)
  }
}

/**
 * Revoke and delete a certificate.
 */
export async function revokeCertificate(domain: string): Promise<void> {
  await exec('certbot', ['delete', '--cert-name', domain, '--non-interactive'], { timeout: 60_000 })
}

/**
 * Check all certificates expiring within RENEW_DAYS_BEFORE_EXPIRY days
 * and attempt renewal. Called by the daily scheduler cron.
 */
export async function renewExpiring(): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + RENEW_DAYS_BEFORE_EXPIRY)

  const expiring = await prisma.sslCertificate.findMany({
    where: {
      autoRenew: true,
      status: 'active',
      expiresAt: { lte: cutoff },
    },
  })

  for (const cert of expiring) {
    try {
      await renewCertificate(cert.domain)
      await prisma.sslCertificate.update({
        where: { id: cert.id },
        data: {
          expiresAt: newExpiryFromNow(),
          status: 'active',
        },
      })
    } catch (err) {
      console.error(`[ssl] Failed to renew cert for ${cert.domain}:`, err)
      await prisma.securityEvent.create({
        data: {
          type: 'ssl_renewal_failed',
          severity: 'warning',
          message: `SSL renewal failed for ${cert.domain}: ${String(err)}`,
        },
      })
    }
  }
}

/**
 * Get cert/key paths for a domain from the letsencrypt live directory.
 */
export function getCertPaths(domain: string): { certPath: string; keyPath: string; chainPath: string } {
  const base = `${config.paths.letsencryptLive}/${domain}`
  return {
    certPath: `${base}/fullchain.pem`,
    keyPath: `${base}/privkey.pem`,
    chainPath: `${base}/chain.pem`,
  }
}

function newExpiryFromNow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 90) // Let's Encrypt issues 90-day certs
  return d
}
