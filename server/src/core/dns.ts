import path from 'path'
import fs from 'fs/promises'
import { config } from '../config.js'
import { exec, writeFile } from './exec.js'

export interface DnsZoneOptions {
  domain: string
  ip: string
  ns1: string
  ns2: string
  mail?: string
  serial?: number
  ttl?: number
}

export function generateZoneFile(opts: DnsZoneOptions): string {
  const {
    domain,
    ip,
    ns1,
    ns2,
    mail = `mail.${opts.domain}`,
    serial = generateSerial(),
    ttl = 3600,
  } = opts

  return `; Zone file for ${domain}
; Managed by NixPanel — do not edit manually
$TTL ${ttl}
@    IN    SOA    ${ns1}. hostmaster.${domain}. (
              ${serial}  ; Serial
              3600       ; Refresh
              1800       ; Retry
              604800     ; Expire
              300 )      ; Minimum TTL

; Name servers
@         IN    NS    ${ns1}.
@         IN    NS    ${ns2}.

; A records
@         IN    A     ${ip}
www       IN    A     ${ip}
mail      IN    A     ${ip}
webmail   IN    A     ${ip}
cpanel    IN    A     ${ip}

; MX record
@         IN    MX    10    ${mail}.

; SPF
@         IN    TXT   "v=spf1 a mx ip4:${ip} ~all"

; DMARC
_dmarc    IN    TXT   "v=DMARC1; p=none; rua=mailto:admin@${domain}"
`
}

/**
 * Create a DNS zone: write the zone file and register it with PowerDNS
 * bind backend, then reload.
 */
export async function createZone(opts: DnsZoneOptions): Promise<string> {
  const zoneFile = path.join(config.paths.pdnsZones, `db.${opts.domain}`)
  await writeFile(zoneFile, generateZoneFile(opts))
  await registerZoneInBindBackend(opts.domain, zoneFile)

  // Tell PowerDNS about the new zone without a full restart
  const reload = await exec('pdns_control', ['bind-add-zone', opts.domain, zoneFile])
  if (reload.exitCode !== 0) {
    // Fall back to full reload if bind-add-zone not supported
    await exec('systemctl', ['reload', 'pdns'])
  }

  return zoneFile
}

/**
 * Remove a DNS zone and reload PowerDNS.
 */
export async function removeZone(domain: string): Promise<void> {
  const zoneFile = path.join(config.paths.pdnsZones, `db.${domain}`)
  await fs.unlink(zoneFile).catch(() => {})
  await unregisterZoneFromBindBackend(domain)
  await exec('systemctl', ['reload', 'pdns'])
}

/**
 * Update just the serial in an existing zone file to force secondary
 * nameservers to re-transfer the zone.
 */
export async function bumpSerial(domain: string): Promise<void> {
  const zoneFile = path.join(config.paths.pdnsZones, `db.${domain}`)
  let content: string
  try {
    content = await fs.readFile(zoneFile, 'utf8')
  } catch {
    throw new Error(`Zone file not found for ${domain}`)
  }

  const newSerial = generateSerial()
  const updated = content.replace(
    /(\d{10})\s*;\s*Serial/,
    `${newSerial}  ; Serial`
  )
  await fs.writeFile(zoneFile, updated, 'utf8')
  await exec('pdns_control', ['bind-reload-now', domain])
}

/**
 * Manage /etc/pdns/bindbackend.conf — the file that lists all zones
 * PowerDNS should serve. Each zone gets one line:
 *   zone=domain.com:/etc/pdns/zones/db.domain.com
 */
async function registerZoneInBindBackend(domain: string, zoneFile: string): Promise<void> {
  const backendConf = config.paths.pdnsBindBackend
  let existing = ''
  try {
    existing = await fs.readFile(backendConf, 'utf8')
  } catch {
    // File may not exist yet on first zone creation
  }

  const entry = `zone=${domain}:${zoneFile}`
  if (!existing.includes(`zone=${domain}`)) {
    await fs.appendFile(backendConf, `${entry}\n`)
  }
}

async function unregisterZoneFromBindBackend(domain: string): Promise<void> {
  const backendConf = config.paths.pdnsBindBackend
  try {
    const content = await fs.readFile(backendConf, 'utf8')
    const cleaned = content
      .split('\n')
      .filter(line => !line.startsWith(`zone=${domain}:`))
      .join('\n')
    await fs.writeFile(backendConf, cleaned, 'utf8')
  } catch {
    // best effort
  }
}

/**
 * Generate a YYYYMMDDNN-style serial number based on today's date.
 * Uses seconds since epoch truncated to 10 digits as a simpler alternative.
 */
function generateSerial(): number {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  // Append 01 as the revision — sufficient for daily zone changes
  return parseInt(`${date}01`, 10)
}
