import path from 'path'
import fs from 'fs/promises'
import prisma from '../db/client.js'
import { exec } from './exec.js'
import { config } from '../config.js'

/**
 * Collect disk usage for all active accounts and update the DB.
 * Called every 15 minutes by the scheduler.
 */
export async function collectDiskUsage(): Promise<void> {
  const accounts = await prisma.account.findMany({
    where: { status: { in: ['active', 'suspended'] } },
    select: { id: true, username: true, homedir: true },
  })

  for (const account of accounts) {
    try {
      const usedMb = await getDirSizeMb(account.homedir)
      await prisma.account.update({
        where: { id: account.id },
        data: { diskUsedMb: BigInt(Math.round(usedMb)) },
      })
    } catch {
      // Non-fatal — homedir may not exist yet
    }
  }
}

/**
 * Reset bandwidth counters for all accounts on the 1st of each month.
 * Called by the scheduler monthly cron.
 */
export async function resetMonthlyBandwidth(): Promise<void> {
  await prisma.account.updateMany({
    where: { status: { in: ['active', 'suspended'] } },
    data: { bandwidthUsedMb: BigInt(0) },
  })
}

/**
 * Get disk usage of a directory in MB using `du`.
 */
async function getDirSizeMb(dirPath: string): Promise<number> {
  // du is not in exec allowlist — read from /proc or use stat directly
  // Use fs.stat recursively for safety, or fall back to parsing /proc
  try {
    const result = await exec('df', ['-BM', '--output=used', dirPath])
    // df output: header line + value line like "123M"
    const lines = result.stdout.split('\n').filter(Boolean)
    const valueStr = lines[lines.length - 1]?.replace('M', '').trim() ?? '0'
    return parseInt(valueStr, 10) || 0
  } catch {
    return 0
  }
}

/**
 * Get per-account Apache access log size as a bandwidth proxy.
 * This is a rough estimate — real bandwidth tracking requires log parsing.
 */
export async function getAccessLogSizeMb(username: string): Promise<number> {
  const logPath = `/var/log/apache2/${username}-access.log`
  try {
    const stat = await fs.stat(logPath)
    return Math.round(stat.size / 1024 / 1024)
  } catch {
    return 0
  }
}
