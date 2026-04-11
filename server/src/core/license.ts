import { config } from '../config.js'

let licenseValid = false
let lastChecked: Date | null = null

/**
 * Validate the license with the licensing server on startup.
 * Throws if the license is invalid or the server is unreachable.
 */
export async function validateOnStartup(): Promise<void> {
  if (!config.licensing.licenseKey) {
    if (config.env === 'development') {
      licenseValid = true
      return
    }
    throw new Error('LICENSE_KEY is not set. Set it in .env to activate NixPanel.')
  }

  await checkLicense()
}

/**
 * Send a heartbeat to the licensing server every 6 hours.
 * If the license becomes invalid, logs a critical event but does NOT shut down —
 * the panel keeps running to avoid accidental outages.
 */
export async function heartbeat(): Promise<void> {
  if (!config.licensing.licenseKey) return

  try {
    await checkLicense()
  } catch (err) {
    console.error('[license] Heartbeat failed:', err)
    // Log to DB if available — non-fatal, don't crash
    try {
      const { default: prisma } = await import('../db/client.js')
      await prisma.securityEvent.create({
        data: {
          type: 'license_heartbeat_failed',
          severity: 'warning',
          message: `License heartbeat failed: ${String(err)}`,
        },
      })
    } catch {
      // DB may be unavailable — ignore
    }
  }
}

export function isLicenseValid(): boolean {
  return licenseValid
}

export function getLastChecked(): Date | null {
  return lastChecked
}

async function checkLicense(): Promise<void> {
  const url = `${config.licensing.serverUrl}/api/v1/validate`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      licenseKey: config.licensing.licenseKey,
      serverIp: await getServerIp(),
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    licenseValid = false
    throw new Error(`License server returned ${response.status}`)
  }

  const data = await response.json() as { valid: boolean; message?: string }
  licenseValid = data.valid
  lastChecked = new Date()

  if (!data.valid) {
    throw new Error(data.message ?? 'License is not valid')
  }
}

async function getServerIp(): Promise<string> {
  try {
    const { createConnection } = await import('net')
    return new Promise((resolve) => {
      const socket = createConnection(80, '8.8.8.8')
      socket.on('connect', () => {
        resolve(socket.localAddress ?? '')
        socket.destroy()
      })
      socket.on('error', () => resolve(''))
    })
  } catch {
    return ''
  }
}
