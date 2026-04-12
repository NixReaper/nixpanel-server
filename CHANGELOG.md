# NixPanel Changelog

All notable changes to NixPanel are documented here.
Versioning follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.
Pre-1.0 versions treat MINOR as feature releases and PATCH as bug fixes.

---

## [0.5.2] — 2026-04-11

### Bug Fixes
- **`curl | bash` aborts immediately at confirmation prompt** — `set -euo pipefail` caused the script to exit when `read` received EOF from the pipe instead of a terminal. Fixed by reading from `/dev/tty` directly so the prompt works correctly whether the script is piped or run from a file.

---

## [0.5.1] — 2026-04-11

### Bug Fixes
- **`install.sh` build steps used `--silent`** — errors during `npm install` and frontend/server builds were suppressed, making failures invisible. Removed `--silent` from all build commands. Also added `rm -rf node_modules package-lock.json` before `npm install` to ensure a clean platform-correct install, consistent with `update.sh`.

---

## [0.5.0] — 2026-04-11

### Bug Fixes
- **Rollup native binary missing on Linux** — `package-lock.json` was generated on Windows and committed to git. It included the Windows rollup binary (`@rollup/rollup-win32-x64-msvc`) but not the Linux one (`@rollup/rollup-linux-x64-gnu`), causing the frontend build to fail on the server with `Cannot find module @rollup/rollup-linux-x64-gnu`.
- **`package-lock.json` added to `.gitignore`** — lock files are platform-specific and must never be committed. The server now generates its own fresh lock file on every update.
- **`update.sh` now does a clean install** — deletes `node_modules/` and `package-lock.json` before `npm install` on every update run to guarantee platform-correct native binaries. Also drops `--silent` from build commands so errors are visible.
- **`.gitignore` corrected** — removed stale `whm/` and `cpanel/` dist paths, added correct `nixserver/` and `nixclient/` paths.

---

## [0.4.9] — 2026-04-11

### Bug Fixes
- **`update.sh` fails when `package-lock.json` has local changes** — `git pull --ff-only` aborted with "Your local changes would be overwritten by merge" whenever npm had modified the lock file on the server. Fixed by running `git checkout -- package-lock.json` before the pull to discard local changes to the generated lock file.

---

## [0.4.8] — 2026-04-11

### Bug Fixes
- **Login page showing stale hardcoded version** — "NixServer v0.3.2 · Port 2087" was hardcoded. Now fetches version live from `GET /api/health` (no auth required) on mount.
- **Login page subtitle** — "Web Host Manager" replaced with "Admin Panel" to remove any WHM trademark association.

---

## [0.4.7] — 2026-04-11

### Bug Fixes
- **Login broken after v0.4.6 update** — `package-lock.json` still mapped the workspace as `@nixpanel/whm`. After renaming the package to `@nixpanel/nixserver`, npm workspace resolution failed during `npm install`, causing the frontend build to break and leaving the panel unresponsive. Fixed by regenerating `package-lock.json` with the correct package name.

---

## [0.4.6] — 2026-04-11

### Changes
- **Removed all WHM trademark references** — "WHM" is a registered trademark of cPanel, L.L.C. All occurrences replaced with "NixServer":
  - Sidebar menu item "Basic WebHost Manager® Setup" → "Basic NixServer Setup"
  - Sidebar menu item "WHM Marketplace" → "NixServer Marketplace"
  - Sidebar menu item "OpenAPI Documentation for WHM" → "OpenAPI Documentation for NixServer"
  - Internal npm package name `@nixpanel/whm` → `@nixpanel/nixserver`

---

## [0.4.5] — 2026-04-11

### Bug Fixes
- **Sidebar version refresh not updating** — clicking the refresh icon now clears the stale version immediately (shows spinner) and adds a `?_t=` cache-bust parameter so the browser never serves a cached response. Same fix applied to the "Retry" button in the error state.
- **`uptime` and `kill` missing from exec allowlist** — caused `GET /api/nixserver/system/info` to throw "Command not allowed", returning 500 and leaving Hostname/OS as `…` on the dashboard.
- **Version fetch auto-retry** — when the version API fails (e.g. during service restart after upgrade), the sidebar now automatically retries every 5 s until it succeeds instead of permanently showing "Version unavailable".

### New Features
- **Day/Night mode toggle** — sun/moon flip switch at the right end of the dashboard info bar. Light palette: page `#f0f4f8`, cards `#ffffff`. Preference persisted to `localStorage`. All pages switch via seven `[data-theme="light"]` CSS overrides in `index.css` without touching individual page files.

---

## [0.4.4] — 2026-04-11

### New Features
- **Server info bar on Dashboard** — cPanel/WHM-style info strip at the top of the NixPanel home page. Shows Username, Hostname, OS, NixPanel Version, Load Averages (live from WebSocket), and Server Monitoring alert count. Alerts are colour-coded: green "All Clear" when all managed services are running; amber "N Alerts" with a count of stopped/failed services.

---

## [0.4.3] — 2026-04-11

### New Features
- **Version display in sidebar** — the sidebar footer shows the currently installed version (e.g. `v0.4.3`), fetched live from the API. A green checkmark indicates up to date; an amber alert indicates an update is available.
- **One-click panel upgrade** — "Upgrade panel" button in the sidebar footer. When a newer version is available it highlights amber and shows the target version. Clicking requires a confirmation step before running. Calls `POST /api/nixserver/system/upgrade` which fires `scripts/update.sh` in the background (git pull → npm install → prisma migrate → build frontends + server → restart service). The panel comes back online automatically after ~60 s.
- **Check for updates button** — small refresh icon next to the version badge re-fetches version info on demand.
- **Backend: `GET /api/nixserver/system/version`** — returns `currentVersion` (read from `/opt/nixpanel/package.json`), `latestVersion` (fetched from GitHub raw content with a 5 s timeout), and `updateAvailable` boolean.
- **Backend: `POST /api/nixserver/system/upgrade`** — admin-only; responds immediately then spawns `scripts/update.sh` detached so the HTTP response is flushed before the service restarts.

---

## [0.4.2] — 2026-04-11

### Changes
- **NixServer sidebar redesigned** — replaced the flat 14-item nav with a full WHM-style collapsible category sidebar (29 categories, ~210 menu items). Categories fold/unfold on click; the active route's category auto-expands on navigation. A live search box at the top of the sidebar filters items across all categories and auto-expands matching results. Sidebar can be hidden entirely via the topbar toggle. All existing routes are wired to their correct menu items; future feature items route to the closest related hub page.

---

## [0.4.1] — 2026-04-11

### Bug Fixes (Installer)
- **SpamAssassin service name**: On Ubuntu 24.04 the service unit is `spamd`, not `spamassassin`. The old `systemctl enable spamassassin` caused the install to abort due to `set -euo pipefail`.
- **PowerDNS port 53 conflict**: `systemd-resolved` stub listener now disabled in a dedicated step that runs *before* package installation. Previously it ran after apt had already tried (and failed) to restart `pdns` during post-install because port 53 was still held by `systemd-resolved`.
- **Git clone into pre-existing directory**: The directory structure step (`mkdir -p`) creates `$INSTALL_DIR` before the clone step, causing `git clone` to fail with "destination path already exists". Fixed by cloning to a temp directory and copying contents into place (preserving any existing `data/` and `logs/` subdirectories).
- **Apache 403 on frontend assets**: Frontend dist files were created with root-only permissions. Added a post-build step that sets 755/644 on all dist directories and files so Apache (`www-data`) can read them.
- **Apache 500 on all API requests**: `mod_proxy_http` was not enabled. Without it, `ProxyPass http://...` directives silently fail and Apache returns 500 for every API call. Also enabled `mod_proxy_wstunnel` (required for the `ws://` WebSocket reverse proxy).

---

## [0.4.0] — 2026-04-11

### New Features
- **Shell Access Manager** (`/accounts/shell-access`): Admin can enable (`/bin/bash`) or disable (`/usr/sbin/nologin`) SSH shell access per hosting account. Reads current shell on account select; shows current state clearly before toggle.
- **Apache Log Viewer** (`/accounts/apache-logs`): Admin can view the last 200 lines of `access.log` or `error.log` from each account's home directory (`~/logs/`). Replaced the former "Coming Soon" stub.
- **Backend: Shell toggle route** — `PUT /api/nixserver/accounts/:id/shell` — validates `enabled` boolean, runs `usermod -s`, updates DB, creates audit log entry.
- **Backend: Per-account Apache log route** — `GET /api/nixserver/webserver/accounts/:username/logs/:type` — validates username against `[a-zA-Z0-9_-]+`, tails `~/logs/{access,error}.log`.

### Changes
- **WebServer page** fully rewritten to Apache-only: shows status for `apache2`, `php8.2-fpm`, `php8.3-fpm`; per-service reload buttons; config test calls `apache2ctl configtest`; log viewer reads from `/var/log/apache2/`.
- **Backend `webserver.ts`** rewritten: removed all nginx references, added Apache (`apache2ctl configtest/reload`), PHP-FPM reload (`systemctl reload php8.x-fpm`), `readdir`-based vhost listing from `/etc/apache2/sites-enabled/`.
- **NginxLogs page** (`/accounts/nginx-logs`) now re-exports `ApacheLogs` — NixPanel uses Apache, not NGINX.
- **Accounts hub** (`/accounts`): removed the separate "Raw NGINX Log Download" card (duplicate of Apache Logs); removed `soon` badges from Shell Access and Apache Log Viewer; fixed Lucide icon `size` prop TypeScript incompatibility.

### Bug Fixes
- `Accounts.tsx`: Lucide icon `ComponentType` declared `size?: number` but Lucide passes `size?: string | number` — widened to `size?: number | string`.
- `Accounts.tsx`: Removed unused `Users` import (TS6133).
- `webserver.ts` (backend): Routes were still calling `nginx -t`, `systemctl reload nginx`, and reading from `/etc/nginx/` despite nginx being removed from the service stack in 0.3.x. Fixed to use Apache equivalents.

---

## [0.3.2] — 2026-03-xx

### Changes
- TypeScript compilation fixes across server, nixserver, nixclient.
- `auth/index.ts`: Fixed `Parameters<typeof prisma.refreshToken.create>` resolving to `unknown` in Prisma 5 — replaced with explicit typed object using `?? undefined` on optional relation fields.
- `nixclient/cron.ts`: Added explicit type annotation `(j: { schedule, command, comment })` to `jobs.map()` callback to resolve implicit `any`.
- `nixserver/accounts.ts`: Added explicit type annotation to over-quota filter lambda.
- `mysql2` added to server dependencies (`^3.11.5`).
- `@types/node-cron` added to server devDependencies (`^3.0.11`).

---

## [0.3.1] — 2026-03-xx

### New Features
- **Databases** (`nixclient`): Full MariaDB database management — create/delete databases, add/remove database users with privilege selection. Backend replaced shell-exec MySQL calls with `mysql2` parameterized queries and identifier allowlist to prevent injection.
- **Email** (`nixclient`): Rewrote email route — replaced `doveadm` calls with `core/mail.ts` functions; added `PUT /:id/password` route; forwarder add/remove via Exim virtual_aliases.
- **SSL** (`nixserver`): Certbot switched from `--webroot` to `--apache` plugin; uses `getCertPaths()` from `core/ssl.ts`.
- **Domains** (`nixclient`): Connected subdomain, addon domain, and parked domain APIs.
- **Stats** (`nixclient`): Disk/bandwidth usage bars + feature usage counts.

### Core Modules Added
- `core/apache.ts` — Apache vhost generation, enable/disable/suspend, PHP-FPM pool management.
- `core/dns.ts` — Rewritten for PowerDNS bind backend; zone file management in `/etc/pdns/zones/`; `pdns_control` integration.
- `core/mail.ts` — Full Exim4 + Dovecot mailbox lifecycle (create, delete, password update, forwarders). Uses `openssl passwd -6 -stdin` via `execWithStdin()`.
- `core/mariadb.ts` — mysql2 connection pool; parameterized DDL for databases and users; `validateIdentifier()` allowlist.
- `core/monitor.ts` — Service health monitor for apache2, php-fpm, exim4, dovecot, pdns, mariadb, fail2ban; auto-restart with rolling window cap.
- `core/ssl.ts` — `issueCertificate()`, `renewExpiring()`, `getCertPaths()`.
- `core/stats.ts` — `collectDiskUsage()` via `df -BM`, `resetMonthlyBandwidth()`.
- `core/license.ts` — Startup validation + 6-hour heartbeat to licensing server.
- `core/exec.ts` — Added `execWithStdin()` via `child_process.spawn` for stdin piping; added pdns, exim4, nixpanel paths to allowlist; removed nginx/bind/postfix.
- `scheduler.ts` — node-cron scheduler for monitor, SSL renewal, disk stats, license heartbeat, bandwidth reset.

### Removed
- `core/nginx.ts` — deleted; replaced by `core/apache.ts`.

---

## [0.3.0] — 2026-03-xx

### Architecture: Service Stack Change
Complete server stack pivot based on cPanel reverse-engineering analysis (Ubuntu 24.04 install diff). Replaced incorrect services with cPanel-equivalent stack:

| Component | Before | After |
|-----------|--------|-------|
| Web server | nginx | Apache2 + mod_proxy_fcgi |
| PHP | php-fpm (generic) | PHP-FPM 8.2 + 8.3 per-account pools |
| DNS | BIND9 | PowerDNS + bind backend |
| Mail MTA | Postfix | Exim4 (exim4-daemon-heavy) |
| Mail IMAP/POP3 | — | Dovecot (imapd, pop3d, lmtpd) |
| Panel database | MariaDB | SQLite (panel-internal) |
| Firewall | UFW | iptables + netfilter-persistent |
| FTP | vsftpd | Deferred to post-v1 |

### Config Changes (`config.ts`)
- Removed nginx paths; added `apacheSites`, `apacheEnabled`, `phpFpmPool82/83`, `pdnsZones`, `pdnsBindBackend`, `eximVirtualDomains`, `eximVirtualMailboxes`, `eximVirtualAliases`, `dovecotPasswd`, `letsencryptLive`.
- Added `mariadb` connection section (host, port, user, password).
- Added `licensing` section (serverUrl, licenseKey).
- Removed `features.terminalEnabled`.

### Prisma Schema (`schema.prisma`)
- Switched provider from `mysql` to `sqlite`.
- Removed all `@db.VarChar`, `@db.Text`, `@db.BigInt` type annotations (SQLite incompatible).
- Added `resellerId Int?` + `reseller` relation to `AuditLog`.
- Added `auditLogs AuditLog[]` to `Reseller` model.
- Removed `TerminalSession` model.
- Fixed account default shell: `/bin/false` → `/usr/sbin/nologin`.

### Installer (`scripts/install.sh`)
- Hard Ubuntu 24.04 check.
- Correct package list: apache2, pdns-server, pdns-backend-bind, exim4, exim4-daemon-heavy, dovecot-core/imapd/pop3d/lmtpd, php8.2-fpm, php8.3-fpm, mariadb-server, certbot python3-certbot-apache, iptables, iptables-persistent, sqlite3.
- Idempotent step tracking via `/var/lib/nixpanel/install/*.done`.
- Package pinning via `/etc/apt/preferences.d/nixpanel-pins` (prevents apt from overriding managed packages).
- Disables unattended-upgrades.
- Creates `nixpanel` system user with nologin shell.
- Configures PowerDNS bind backend; disables systemd-resolved stub.
- Configures Exim4 via debconf for internet site mode.
- Configures Dovecot with passwd-file auth.
- SQLite database at `/opt/nixpanel/data/nixpanel.db`.
- iptables rules with `netfilter-persistent save`.
- Certbot Apache deploy hook for auto-reload.

---

## [0.2.x] — Prior

Initial development with incorrect service stack (nginx, BIND9, Postfix, MariaDB for panel data). Functional skeleton of API routes; no production-ready installer.
