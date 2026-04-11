import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

const execFileAsync = promisify(execFile)

// Commands allowed to be executed — nothing outside this list runs
const ALLOWED_COMMANDS = new Set([
  // User management
  'useradd', 'userdel', 'usermod', 'chage', 'id',
  // File operations
  'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'ln', 'tar',
  'find', 'du', 'df', 'stat',
  // Web server
  'apache2ctl', 'a2ensite', 'a2dissite', 'a2enmod', 'a2dismod',
  // DNS
  'pdns_control', 'pdnsutil',
  // Mail
  'dovecot', 'openssl',
  // SSL
  'certbot',
  // Services
  'systemctl',
  // Network
  'ss', 'ip', 'hostname',
  // System
  'uname', 'uptime', 'free', 'ps', 'kill',
  // PHP
  'php8.2', 'php8.3',
  // Fail2ban
  'fail2ban-client',
  // iptables
  'iptables', 'netfilter-persistent',
])

// Shell metacharacters never allowed in arguments
const DANGEROUS_CHARS = /[;&|`$<>()\n\r\0]/

// Paths allowed for file read/write operations
const ALLOWED_PATH_PREFIXES = [
  '/home/',
  '/etc/apache2/',
  '/etc/php/',
  '/etc/pdns/',
  '/etc/exim4/',
  '/etc/dovecot/',
  '/etc/letsencrypt/',
  '/etc/fail2ban/',
  '/etc/nixpanel/',
  '/var/www/',
  '/var/log/',
  '/opt/nixpanel/',
]

function validateArg(arg: string): void {
  if (DANGEROUS_CHARS.test(arg)) {
    throw new Error(`Argument contains forbidden characters: ${arg}`)
  }
}

function isAllowedPath(p: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(prefix => p.startsWith(prefix))
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ExecOptions {
  timeout?: number
  input?: string   // data to pipe to stdin
}

/**
 * Execute a whitelisted system command safely.
 * Uses execFile (no shell). Throws if command is not in the allowlist
 * or any argument contains shell metacharacters.
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

  // If stdin input is needed, use spawn so we can write to stdin
  if (options.input !== undefined) {
    return execWithStdin(command, args, options.input, options.timeout ?? 30_000)
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: options.timeout ?? 30_000,
      maxBuffer: 10 * 1024 * 1024,
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

function execWithStdin(
  command: string,
  args: string[],
  input: string,
  timeout: number
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      child.kill()
      resolve({ stdout: stdout.trim(), stderr: 'Command timed out', exitCode: 1 })
    }, timeout)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 })
    })

    child.stdin.write(input)
    child.stdin.end()
  })
}

/**
 * Write content to a file in an allowed path.
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  if (!isAllowedPath(filePath)) {
    throw new Error(`Path not in allowed list: ${filePath}`)
  }
  const { writeFile: fsWrite } = await import('fs/promises')
  await fsWrite(filePath, content, 'utf8')
}

/**
 * Read a file from an allowed path.
 */
export async function readFile(filePath: string): Promise<string> {
  if (!isAllowedPath(filePath)) {
    throw new Error(`Path not in allowed list: ${filePath}`)
  }
  const { readFile: fsRead } = await import('fs/promises')
  return fsRead(filePath, 'utf8')
}

export function isRoot(): boolean {
  return process.getuid?.() === 0
}

export function validateUsername(username: string): boolean {
  return /^[a-z][a-z0-9_-]{0,31}$/.test(username)
}

export function validateDomain(domain: string): boolean {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain)
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}
