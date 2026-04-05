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
    whmPort: parseInt(optional('WHM_PORT', '2087'), 10),
    cpanelPort: parseInt(optional('CPANEL_PORT', '2083'), 10),
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
    nginxSites: optional('NGINX_SITES_DIR', '/etc/nginx/sites-available'),
    nginxEnabled: optional('NGINX_ENABLED_DIR', '/etc/nginx/sites-enabled'),
    apacheSites: optional('APACHE_SITES_DIR', '/etc/apache2/sites-available'),
    apacheEnabled: optional('APACHE_ENABLED_DIR', '/etc/apache2/sites-enabled'),
    bindZones: optional('BIND_ZONES_DIR', '/etc/bind/zones'),
    certbotWebroot: optional('CERTBOT_WEBROOT', '/var/www/letsencrypt'),
  },

  rateLimit: {
    max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  },

  features: {
    terminalEnabled: optional('ENABLE_TERMINAL', 'true') === 'true',
    wsStatsInterval: parseInt(optional('WEBSOCKET_STATS_INTERVAL', '5000'), 10),
  },
} as const
