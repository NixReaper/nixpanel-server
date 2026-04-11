import cron from 'node-cron'
import { checkAll } from './core/monitor.js'
import { closePool } from './core/mariadb.js'

let started = false

export function startScheduler(): void {
  if (started) return
  started = true

  // Service health monitor — every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkAll()
    } catch (err) {
      console.error('[scheduler] monitor.checkAll error:', err)
    }
  })

  // SSL renewal check — daily at 3am
  cron.schedule('0 3 * * *', async () => {
    try {
      const { renewExpiring } = await import('./core/ssl.js')
      await renewExpiring()
    } catch (err) {
      console.error('[scheduler] ssl.renewExpiring error:', err)
    }
  })

  // Disk usage stats — every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const { collectDiskUsage } = await import('./core/stats.js')
      await collectDiskUsage()
    } catch (err) {
      console.error('[scheduler] stats.collectDiskUsage error:', err)
    }
  })

  // License heartbeat — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      const { heartbeat } = await import('./core/license.js')
      await heartbeat()
    } catch (err) {
      console.error('[scheduler] license.heartbeat error:', err)
    }
  })

  // Bandwidth reset — 1st of every month at 00:05
  cron.schedule('5 0 1 * *', async () => {
    try {
      const { resetMonthlyBandwidth } = await import('./core/stats.js')
      await resetMonthlyBandwidth()
    } catch (err) {
      console.error('[scheduler] stats.resetMonthlyBandwidth error:', err)
    }
  })

  console.log('[scheduler] Background jobs started')
}

export async function stopScheduler(): Promise<void> {
  await closePool()
}
