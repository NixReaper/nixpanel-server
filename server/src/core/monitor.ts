import prisma from '../db/client.js'
import { exec } from './exec.js'
import { getServiceStatus } from './system.js'

interface MonitoredService {
  name: string
  restartOnFail: boolean
  maxRestarts: number
  restartWindowMinutes: number
}

const MONITORED: MonitoredService[] = [
  { name: 'apache2',     restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'php8.2-fpm',  restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'php8.3-fpm',  restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'exim4',       restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'dovecot',     restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'pdns',        restartOnFail: true, maxRestarts: 3, restartWindowMinutes: 10 },
  { name: 'mariadb',     restartOnFail: true, maxRestarts: 2, restartWindowMinutes: 10 },
  { name: 'fail2ban',    restartOnFail: true, maxRestarts: 2, restartWindowMinutes: 30 },
]

// In-memory restart history: service name → timestamps of recent restarts
const restartHistory = new Map<string, Date[]>()

export async function checkAll(): Promise<void> {
  for (const svc of MONITORED) {
    try {
      await checkService(svc)
    } catch (err) {
      // Don't let one service check failure stop the rest
      console.error(`[monitor] Error checking ${svc.name}:`, err)
    }
  }
}

async function checkService(svc: MonitoredService): Promise<void> {
  const status = await getServiceStatus(svc.name)

  if (status.status !== 'failed') return

  if (!svc.restartOnFail) {
    await logEvent('service_failed', `Service ${svc.name} is in failed state`, 'warning')
    return
  }

  const recentRestarts = getRecentRestartCount(svc.name, svc.restartWindowMinutes)

  if (recentRestarts >= svc.maxRestarts) {
    await logEvent(
      'service_restart_loop',
      `Service ${svc.name} failed ${recentRestarts} times in ${svc.restartWindowMinutes} minutes — not restarting`,
      'critical'
    )
    return
  }

  const result = await exec('systemctl', ['restart', svc.name])
  recordRestart(svc.name)

  if (result.exitCode !== 0) {
    await logEvent(
      'service_restart_failed',
      `Failed to restart ${svc.name}: ${result.stderr}`,
      'critical'
    )
  } else {
    await logEvent(
      'service_restarted',
      `Service ${svc.name} was in failed state — automatically restarted`,
      'warning'
    )
  }
}

function getRecentRestartCount(serviceName: string, windowMinutes: number): number {
  const history = restartHistory.get(serviceName) ?? []
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)
  const recent = history.filter(ts => ts > cutoff)
  restartHistory.set(serviceName, recent)
  return recent.length
}

function recordRestart(serviceName: string): void {
  const history = restartHistory.get(serviceName) ?? []
  history.push(new Date())
  restartHistory.set(serviceName, history)
}

async function logEvent(type: string, message: string, severity: 'info' | 'warning' | 'critical'): Promise<void> {
  try {
    await prisma.securityEvent.create({ data: { type, message, severity } })
  } catch {
    // Don't let a DB error crash the monitor
    console.error(`[monitor] Failed to log event: ${type} — ${message}`)
  }
}
