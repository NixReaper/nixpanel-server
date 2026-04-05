import path from 'path'
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
  chainPath?: string
  aliases?: string[]
}

/**
 * Generate an nginx vhost config for a hosting account.
 */
export function generateVhost(opts: VhostOptions): string {
  const {
    domain,
    username,
    documentRoot,
    phpVersion = '8.3',
    sslEnabled = false,
    certPath,
    keyPath,
    chainPath,
    aliases = [],
  } = opts

  const phpSocket = `/run/php/php${phpVersion}-fpm-${username}.sock`
  const serverName = [domain, ...aliases].join(' ')

  const sslBlock = sslEnabled && certPath && keyPath
    ? `
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ${chainPath ? `ssl_trusted_certificate ${chainPath};` : ''}
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
`
    : `
    listen 80;
    listen [::]:80;
`

  const redirectBlock = sslEnabled
    ? `
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};
    return 301 https://$host$request_uri;
}
`
    : ''

  return `${redirectBlock}
server {
    ${sslBlock.trim()}
    server_name ${serverName};

    root ${documentRoot};
    index index.php index.html index.htm;

    access_log /var/log/nginx/${username}.access.log;
    error_log /var/log/nginx/${username}.error.log;

    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${phpSocket};
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }

    location ~ /\\.git {
        deny all;
    }

    # Let's Encrypt webroot
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
}
`.trim()
}

/**
 * Write an nginx vhost to disk and enable it.
 */
export async function enableVhost(opts: VhostOptions): Promise<void> {
  const confPath = path.join(config.paths.nginxSites, `${opts.domain}.conf`)
  const enabledPath = path.join(config.paths.nginxEnabled, `${opts.domain}.conf`)

  await writeFile(confPath, generateVhost(opts))

  // Symlink to sites-enabled
  await exec('ln', ['-sf', confPath, enabledPath])

  // Test and reload
  const test = await exec('nginx', ['-t'])
  if (test.exitCode !== 0) {
    throw new Error(`nginx config test failed: ${test.stderr}`)
  }

  await exec('systemctl', ['reload', 'nginx'])
}

/**
 * Remove a vhost config and reload nginx.
 */
export async function disableVhost(domain: string): Promise<void> {
  const confPath = path.join(config.paths.nginxSites, `${domain}.conf`)
  const enabledPath = path.join(config.paths.nginxEnabled, `${domain}.conf`)

  await exec('rm', ['-f', enabledPath])
  await exec('rm', ['-f', confPath])
  await exec('systemctl', ['reload', 'nginx'])
}
