import path from 'path'
import fs from 'fs/promises'
import { config } from '../config.js'
import { exec, writeFile } from './exec.js'

export interface VhostOptions {
  domain: string
  username: string
  documentRoot: string
  phpVersion?: string
  sslEnabled?: boolean
  certPath?: string
  keyPath?: string
  aliases?: string[]
}

export function generateVhost(opts: VhostOptions): string {
  const {
    domain,
    username,
    documentRoot,
    phpVersion = '8.3',
    sslEnabled = false,
    certPath,
    keyPath,
    aliases = [],
  } = opts

  const phpSocket = `/run/php/php${phpVersion}-fpm-${username}.sock`
  const serverAlias = aliases.length > 0 ? `    ServerAlias ${aliases.join(' ')}\n` : ''

  const httpVhost = `<VirtualHost *:80>
    ServerName ${domain}
${serverAlias}    DocumentRoot ${documentRoot}

    <FilesMatch \\.php$>
        SetHandler "proxy:unix:${phpSocket}|fcgi://localhost"
    </FilesMatch>

    <Directory ${documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    CustomLog /var/log/apache2/${username}-access.log combined
    ErrorLog /var/log/apache2/${username}-error.log

    Alias /.well-known/acme-challenge/ /var/www/letsencrypt/.well-known/acme-challenge/
    <Directory /var/www/letsencrypt/.well-known/acme-challenge/>
        Require all granted
    </Directory>
${sslEnabled ? `\n    RewriteEngine On\n    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]\n` : ''}
</VirtualHost>`

  if (!sslEnabled || !certPath || !keyPath) {
    return httpVhost
  }

  const sslVhost = `
<VirtualHost *:443>
    ServerName ${domain}
${serverAlias}    DocumentRoot ${documentRoot}

    SSLEngine on
    SSLCertificateFile ${certPath}
    SSLCertificateKeyFile ${keyPath}
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder off
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    <FilesMatch \\.php$>
        SetHandler "proxy:unix:${phpSocket}|fcgi://localhost"
    </FilesMatch>

    <Directory ${documentRoot}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    CustomLog /var/log/apache2/${username}-access.log combined
    ErrorLog /var/log/apache2/${username}-error.log
</VirtualHost>`

  return `${httpVhost}\n${sslVhost}`
}

export function generateSuspendedVhost(domain: string, username: string, aliases: string[] = []): string {
  const serverAlias = aliases.length > 0 ? `    ServerAlias ${aliases.join(' ')}\n` : ''
  return `<VirtualHost *:80>
    ServerName ${domain}
${serverAlias}
    DocumentRoot /var/www/html

    RedirectMatch 503 ^/(?!\.well-known)
    ErrorDocument 503 "<html><body><h1>Account Suspended</h1><p>This account has been suspended. Please contact support.</p></body></html>"

    CustomLog /var/log/apache2/${username}-access.log combined
    ErrorLog /var/log/apache2/${username}-error.log
</VirtualHost>`
}

export function generatePhpFpmPool(username: string, phpVersion: string): string {
  return `[${username}]
user = ${username}
group = ${username}
listen = /run/php/php${phpVersion}-fpm-${username}.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = ondemand
pm.max_children = 10
pm.process_idle_timeout = 10s
pm.max_requests = 500

chdir = /

php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec
php_admin_value[open_basedir] = /home/${username}/:/tmp/
php_admin_value[error_log] = /home/${username}/logs/php_errors.log
php_admin_flag[log_errors] = on
php_admin_flag[allow_url_fopen] = off
`
}

export async function enableVhost(opts: VhostOptions): Promise<void> {
  const confFile = `${opts.domain}.conf`
  const confPath = path.join(config.paths.apacheSites, confFile)
  const enabledPath = path.join(config.paths.apacheEnabled, confFile)

  await writeFile(confPath, generateVhost(opts))
  await exec('ln', ['-sf', confPath, enabledPath])

  const test = await exec('apache2ctl', ['configtest'])
  if (test.exitCode !== 0) {
    // Roll back on bad config
    await fs.unlink(enabledPath).catch(() => {})
    await fs.unlink(confPath).catch(() => {})
    throw new Error(`Apache config test failed: ${test.stderr}`)
  }

  await exec('systemctl', ['reload', 'apache2'])
}

export async function disableVhost(domain: string): Promise<void> {
  const confFile = `${domain}.conf`
  await exec('a2dissite', [confFile])
  await fs.unlink(path.join(config.paths.apacheSites, confFile)).catch(() => {})
  await exec('systemctl', ['reload', 'apache2'])
}

export async function suspendVhost(domain: string, username: string, aliases: string[] = []): Promise<void> {
  const confFile = `${domain}.conf`
  const confPath = path.join(config.paths.apacheSites, confFile)
  await writeFile(confPath, generateSuspendedVhost(domain, username, aliases))
  await exec('systemctl', ['reload', 'apache2'])
}

export async function enablePhpFpmPool(username: string, phpVersion: string): Promise<void> {
  const poolDir = phpVersion === '8.2' ? config.paths.phpFpmPool82 : config.paths.phpFpmPool83
  const poolPath = path.join(poolDir, `${username}.conf`)
  await writeFile(poolPath, generatePhpFpmPool(username, phpVersion))
  await exec('systemctl', ['reload', `php${phpVersion}-fpm`])
}

export async function disablePhpFpmPool(username: string, phpVersion: string): Promise<void> {
  const poolDir = phpVersion === '8.2' ? config.paths.phpFpmPool82 : config.paths.phpFpmPool83
  const poolPath = path.join(poolDir, `${username}.conf`)
  await fs.unlink(poolPath).catch(() => {})
  await exec('systemctl', ['reload', `php${phpVersion}-fpm`])
}
