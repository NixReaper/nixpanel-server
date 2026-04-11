import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  server: {
    host: optional('HOST', '0.0.0.0'),
    nixserverPort: parseInt(optional('NIXSERVER_PORT', '4000'), 10),
    nixclientPort: parseInt(optional('NIXCLIENT_PORT', '4001'), 10),
  },

  db: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-in-production'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  admin: {
    username: optional('ADMIN_USERNAME', 'root'),
    password: optional('ADMIN_PASSWORD', 'admin123'),
    email: optional('ADMIN_EMAIL', 'admin@localhost'),
  },

  paths: {
    homeDir: optional('HOME_DIR', '/home'),
    apacheSites: optional('APACHE_SITES_DIR', '/etc/apache2/sites-available'),
    apacheEnabled: optional('APACHE_ENABLED_DIR', '/etc/apache2/sites-enabled'),
    phpFpmPool82: optional('PHP_FPM_POOL_82', '/etc/php/8.2/fpm/pool.d'),
    phpFpmPool83: optional('PHP_FPM_POOL_83', '/etc/php/8.3/fpm/pool.d'),
    pdnsZones: optional('PDNS_ZONES_DIR', '/etc/pdns/zones'),
    pdnsBindBackend: optional('PDNS_BIND_BACKEND', '/etc/pdns/bindbackend.conf'),
    eximVirtualDomains: optional('EXIM_VIRTUAL_DOMAINS', '/etc/exim4/virtual_domains'),
    eximVirtualMailboxes: optional('EXIM_VIRTUAL_MAILBOXES', '/etc/exim4/virtual_mailboxes'),
    eximVirtualAliases: optional('EXIM_VIRTUAL_ALIASES', '/etc/exim4/virtual_aliases'),
    dovecotPasswd: optional('DOVECOT_PASSWD', '/etc/dovecot/passwd'),
    certbotWebroot: optional('CERTBOT_WEBROOT', '/var/www/letsencrypt'),
    letsencryptLive: optional('LETSENCRYPT_LIVE', '/etc/letsencrypt/live'),
  },

  rateLimit: {
    max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  mariadb: {
    host: optional('MARIADB_HOST', '127.0.0.1'),
    port: parseInt(optional('MARIADB_PORT', '3306'), 10),
    user: optional('MARIADB_USER', 'root'),
    password: optional('MARIADB_PASSWORD', ''),
  },

  licensing: {
    serverUrl: optional('LICENSING_SERVER_URL', 'https://license.nixpanel.io'),
    licenseKey: optional('LICENSE_KEY', ''),
  },

  features: {
    wsStatsInterval: parseInt(optional('WEBSOCKET_STATS_INTERVAL', '5000'), 10),
  },
} as const
