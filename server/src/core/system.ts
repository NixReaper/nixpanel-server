import { readFile } from 'fs/promises'
import { exec } from './exec.js'
import type { SystemStats, ServiceStatus } from '../types/index.js'

/**
 * Read CPU usage (0-100%) from /proc/stat.
 */
async function getCpuUsage(): Promise<number> {
  try {
    const stat1 = await readFile('/proc/stat', 'utf8')
    await new Promise(r => setTimeout(r, 200))
    const stat2 = await readFile('/proc/stat', 'utf8')

    const parse = (s: string) => {
      const line = s.split('\n')[0].split(' ').filter(Boolean).slice(1).map(Number)
      const idle = line[3] + line[4]
      const total = line.reduce((a, b) => a + b, 0)
      return { idle, total }
    }

    const s1 = parse(stat1)
    const s2 = parse(stat2)
    const idleDiff = s2.idle - s1.idle
    const totalDiff = s2.total - s1.total
    return Math.round((1 - idleDiff / totalDiff) * 100)
  } catch {
    return 0
  }
}

/**
 * Get memory stats from /proc/meminfo (bytes).
 */
async function getMemoryStats(): Promise<SystemStats['memory']> {
  try {
    const content = await readFile('/proc/meminfo', 'utf8')
    const get = (key: string) => {
      const match = content.match(new RegExp(`${key}:\\s+(\\d+)\\s+kB`))
      return match ? parseInt(match[1], 10) * 1024 : 0
    }
    const total = get('MemTotal')
    const free = get('MemFree')
    const buffers = get('Buffers')
    const cached = get('Cached')
    const used = total - free - buffers - cached
    return {
      total,
      used,
      free: total - used,
      percent: Math.round((used / total) * 100),
    }
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 }
  }
}

/**
 * Get disk usage for / (bytes).
 */
async function getDiskStats(): Promise<SystemStats['disk']> {
  try {
    const result = await exec('df', ['-B1', '/'])
    const lines = result.stdout.split('\n')
    const parts = lines[1]?.split(/\s+/)
    if (!parts) return { total: 0, used: 0, free: 0, percent: 0 }
    const total = parseInt(parts[1], 10)
    const used = parseInt(parts[2], 10)
    const free = parseInt(parts[3], 10)
    return { total, used, free, percent: Math.round((used / total) * 100) }
  } catch {
    return { total: 0, used: 0, free: 0, percent: 0 }
  }
}

/**
 * Get system load averages from /proc/loadavg.
 */
async function getLoadAvg(): Promise<[number, number, number]> {
  try {
    const content = await readFile('/proc/loadavg', 'utf8')
    const parts = content.split(' ')
    return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])]
  } catch {
    return [0, 0, 0]
  }
}

/**
 * Gather all system stats in parallel.
 */
export async function getSystemStats(): Promise<SystemStats> {
  const [cpu, memory, disk, load] = await Promise.all([
    getCpuUsage(),
    getMemoryStats(),
    getDiskStats(),
    getLoadAvg(),
  ])

  return {
    cpu,
    memory,
    disk,
    load,
    uptime: Math.floor(process.uptime()),
  }
}

/**
 * Check the status of a systemd service.
 */
export async function getServiceStatus(name: string): Promise<ServiceStatus> {
  const [activeResult, enabledResult] = await Promise.all([
    exec('systemctl', ['is-active', name]),
    exec('systemctl', ['is-enabled', name]),
  ])

  const active = activeResult.stdout.trim()
  const enabled = enabledResult.stdout.trim() === 'enabled'

  let status: ServiceStatus['status'] = 'unknown'
  if (active === 'active') status = 'running'
  else if (active === 'inactive') status = 'stopped'
  else if (active === 'failed') status = 'failed'

  return { name, status, enabled }
}

export const MANAGED_SERVICES = [
  'nginx', 'apache2', 'mysql', 'mariadb',
  'postfix', 'dovecot', 'vsftpd', 'bind9',
  'fail2ban', 'ufw', 'cron', 'ssh',
]
