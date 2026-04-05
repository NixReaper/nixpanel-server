import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

const execFileAsync = promisify(execFile)

// Commands allowed to be executed — nothing outside this list runs
const ALLOWED_COMMANDS = new Set([
  // User management
  'useradd', 'userdel', 'usermod', 'passwd', 'chage', 'id', 'groups',
  // File operations
  'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'ln', 'tar', 'gzip', 'gunzip',
  'find', 'du', 'df', 'ls', 'stat',
  // Web servers
  'nginx', 'apache2', 'apache2ctl', 'a2ensite', 'a2dissite', 'a2enmod', 'a2dismod',
  // DNS
  'named', 'named-checkconf', 'named-checkzone', 'rndc',
  // Mail
  'postfix', 'postmap', 'postconf', 'dovecot', 'doveadm',
  // SSL
  'certbot', 'openssl',
  // FTP
  'vsftpd',
  // Services
  'systemctl', 'service',
  // Network
  'ss', 'ip', 'hostname', 'ping', 'traceroute', 'dig', 'nslookup',
  // System
  'uname', 'uptime', 'free', 'vmstat', 'iostat', 'top', 'ps', 'kill', 'pkill',
  'cat', 'grep', 'awk', 'sed', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut',
  // Package managers
  'apt', 'apt-get', 'dpkg',
  // MySQL/MariaDB
  'mysql', 'mysqladmin', 'mysqlcheck', 'mysqldump',
  // PHP
  'php', 'php7.4', 'php8.0', 'php8.1', 'php8.2', 'php8.3', 'update-alternatives',
  // Misc
  'touch', 'echo', 'which', 'whoami', 'env',
  // Fail2ban
  'fail2ban-client',
  // UFW
  'ufw',
])

// Characters never allowed in arguments (shell injection prevention)
const DANGEROUS_CHARS = /[;&|`$<>()\n\r\0]/

// Paths outside these prefixes are blocked for file operations
const ALLOWED_PATH_PREFIXES = [
  '/home/',
  '/etc/nginx/',
  '/etc/apache2/',
  '/etc/bind/',
  '/etc/postfix/',
  '/etc/dovecot/',
  '/etc/vsftpd',
  '/etc/php/',
  '/etc/letsencrypt/',
  '/etc/fail2ban/',
  '/var/www/',
  '/var/mail/',
  '/var/log/',
  '/var/spool/cron/',
  '/tmp/',
  '/usr/local/nixpanel/',
]

function validateArg(arg: string): void {
  if (DANGEROUS_CHARS.test(arg)) {
    throw new Error(`Argument contains forbidden characters: ${arg}`)
  }
}

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix))
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ExecOptions {
  timeout?: number
  allowedPaths?: string[]
}

/**
 * Execute a whitelisted system command safely.
 * Throws if the command is not in the allowlist or args contain shell metacharacters.
 */
export async function exec(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`)
  }

  for (const arg of args) {
    validateArg(arg)
  }

  const timeout = options.timeout ?? 30_000

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: (e.stdout ?? '').trim(),
      stderr: (e.stderr ?? e.message ?? '').trim(),
      exitCode: typeof e.code === 'number' ? e.code : 1,
    }
  }
}

/**
 * Write content to a file in an allowed path using a safe method (no shell).
 */
export async function writeFile(path: string, content: string): Promise<void> {
  if (!isAllowedPath(path)) {
    throw new Error(`Path not in allowed list: ${path}`)
  }
  const { writeFile: fsWrite } = await import('fs/promises')
  await fsWrite(path, content, 'utf8')
}

/**
 * Read a file from an allowed path.
 */
export async function readFile(path: string): Promise<string> {
  if (!isAllowedPath(path)) {
    throw new Error(`Path not in allowed list: ${path}`)
  }
  const { readFile: fsRead } = await import('fs/promises')
  return fsRead(path, 'utf8')
}

/**
 * Check if running as root.
 */
export function isRoot(): boolean {
  return process.getuid?.() === 0
}

/**
 * Validate a Linux username.
 */
export function validateUsername(username: string): boolean {
  return /^[a-z][a-z0-9_-]{0,31}$/.test(username)
}

/**
 * Validate a domain name.
 */
export function validateDomain(domain: string): boolean {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)
}

/**
 * File exists check without shell.
 */
export function fileExists(path: string): boolean {
  return existsSync(path)
}
