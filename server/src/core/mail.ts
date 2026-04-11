import path from 'path'
import fs from 'fs/promises'
import { config } from '../config.js'
import { exec } from './exec.js'

/**
 * Hash a password using SHA-512-CRYPT — the scheme Dovecot understands
 * natively without any extra configuration.
 */
export async function hashMailPassword(password: string): Promise<string> {
  const result = await exec('openssl', ['passwd', '-6', '-stdin'], { input: password })
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    throw new Error(`Failed to hash mail password: ${result.stderr}`)
  }
  return result.stdout.trim()
}

/**
 * Add an email address to /etc/dovecot/passwd.
 * Format: address:hash:::::::
 */
export async function addMailboxToPasswd(address: string, passwordHash: string): Promise<void> {
  const entry = `${address}:${passwordHash}:::::::\n`
  await fs.appendFile(config.paths.dovecotPasswd, entry)
}

/**
 * Remove an email address from /etc/dovecot/passwd.
 */
export async function removeMailboxFromPasswd(address: string): Promise<void> {
  await removeLineStartingWith(config.paths.dovecotPasswd, `${address}:`)
}

/**
 * Update the password for an existing mailbox in /etc/dovecot/passwd.
 */
export async function updateMailboxPassword(address: string, newPassword: string): Promise<void> {
  const hash = await hashMailPassword(newPassword)
  const passwd = config.paths.dovecotPasswd
  const content = await fs.readFile(passwd, 'utf8')
  const updated = content
    .split('\n')
    .map(line => {
      if (line.startsWith(`${address}:`)) {
        const parts = line.split(':')
        parts[1] = hash
        return parts.join(':')
      }
      return line
    })
    .join('\n')
  await fs.writeFile(passwd, updated, 'utf8')
}

/**
 * Ensure a domain is listed in /etc/exim4/virtual_domains.
 */
export async function addVirtualDomain(domain: string): Promise<void> {
  const content = await readFileOrEmpty(config.paths.eximVirtualDomains)
  const domains = content.split('\n').map(l => l.trim()).filter(Boolean)
  if (!domains.includes(domain)) {
    await fs.appendFile(config.paths.eximVirtualDomains, `${domain}\n`)
  }
}

/**
 * Remove a domain from /etc/exim4/virtual_domains if no mailboxes remain.
 * The caller is responsible for checking whether mailboxes exist before calling.
 */
export async function removeVirtualDomain(domain: string): Promise<void> {
  await removeLineStartingWith(config.paths.eximVirtualDomains, domain)
}

/**
 * Add a mailbox entry to /etc/exim4/virtual_mailboxes.
 * Format: address@domain  domain/address/Maildir/
 */
export async function addMailboxToExim(address: string, maildirPath: string): Promise<void> {
  const entry = `${address}  ${maildirPath}/\n`
  await fs.appendFile(config.paths.eximVirtualMailboxes, entry)
}

/**
 * Remove a mailbox entry from /etc/exim4/virtual_mailboxes.
 */
export async function removeMailboxFromExim(address: string): Promise<void> {
  await removeLineStartingWith(config.paths.eximVirtualMailboxes, `${address} `)
}

/**
 * Add a forwarder to /etc/exim4/virtual_aliases.
 * Format: source@domain  destination@domain
 */
export async function addForwarder(source: string, destination: string): Promise<void> {
  const entry = `${source}  ${destination}\n`
  await fs.appendFile(config.paths.eximVirtualAliases, entry)
}

/**
 * Remove a specific forwarder from /etc/exim4/virtual_aliases.
 */
export async function removeForwarder(source: string): Promise<void> {
  await removeLineStartingWith(config.paths.eximVirtualAliases, `${source} `)
}

/**
 * Create the Maildir directory structure for a mailbox.
 * Path: /home/{username}/mail/{domain}/{localpart}/
 */
export async function createMaildir(username: string, domain: string, localpart: string): Promise<string> {
  const maildirBase = path.join(config.paths.homeDir, username, 'mail', domain, localpart)
  await fs.mkdir(path.join(maildirBase, 'new'), { recursive: true })
  await fs.mkdir(path.join(maildirBase, 'cur'), { recursive: true })
  await fs.mkdir(path.join(maildirBase, 'tmp'), { recursive: true })
  await exec('chown', ['-R', `${username}:${username}`, path.join(config.paths.homeDir, username, 'mail')])
  await exec('chmod', ['700', path.join(config.paths.homeDir, username, 'mail')])
  return maildirBase
}

/**
 * Remove the Maildir for a mailbox.
 */
export async function removeMaildir(username: string, domain: string, localpart: string): Promise<void> {
  const maildirBase = path.join(config.paths.homeDir, username, 'mail', domain, localpart)
  await fs.rm(maildirBase, { recursive: true, force: true })
}

/**
 * Full lifecycle: create a mailbox including Exim entry, Dovecot passwd entry,
 * and Maildir on disk. Reloads both Exim and Dovecot.
 */
export async function createMailbox(
  username: string,
  address: string,
  password: string
): Promise<void> {
  const [localpart, domain] = address.split('@')
  if (!localpart || !domain) throw new Error(`Invalid email address: ${address}`)

  const hash = await hashMailPassword(password)
  const maildirPath = await createMaildir(username, domain, localpart)

  await addVirtualDomain(domain)
  await addMailboxToExim(address, maildirPath)
  await addMailboxToPasswd(address, hash)

  await reloadMailServices()
}

/**
 * Full lifecycle: remove a mailbox. Does NOT remove the virtual domain —
 * caller should check if other mailboxes exist for the domain first.
 */
export async function removeMailbox(
  username: string,
  address: string,
  deleteMaildir = false
): Promise<void> {
  const [localpart, domain] = address.split('@')
  if (!localpart || !domain) throw new Error(`Invalid email address: ${address}`)

  await removeMailboxFromExim(address)
  await removeMailboxFromPasswd(address)
  if (deleteMaildir) {
    await removeMaildir(username, domain, localpart)
  }

  await reloadMailServices()
}

async function reloadMailServices(): Promise<void> {
  await exec('systemctl', ['reload', 'exim4'])
  await exec('systemctl', ['reload', 'dovecot'])
}

async function readFileOrEmpty(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function removeLineStartingWith(filePath: string, prefix: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    const cleaned = content
      .split('\n')
      .filter(line => !line.startsWith(prefix))
      .join('\n')
    await fs.writeFile(filePath, cleaned, 'utf8')
  } catch {
    // best effort — file may not exist
  }
}
