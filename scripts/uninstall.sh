#!/usr/bin/env bash
# NixPanel uninstaller
set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'

[[ $EUID -ne 0 ]] && { echo -e "${RED}Must be run as root${RESET}"; exit 1; }

INSTALL_DIR="${1:-/opt/nixpanel}"

echo -e "${BOLD}${RED}NixPanel Uninstaller${RESET}"
echo ""
echo -e "${YELLOW}This will:${RESET}"
echo "  - Stop and remove the nixpanel systemd service"
echo "  - Remove the nginx nixpanel.conf vhost"
echo "  - Remove $INSTALL_DIR"
echo "  - Drop the nixpanel MariaDB database and user"
echo ""
echo -e "${RED}${BOLD}This does NOT remove: nginx, MariaDB, PHP, Postfix, Dovecot, vsftpd, or BIND.${RESET}"
echo ""
read -r -p "Type 'yes' to confirm: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; exit 0; }

echo ""

# Stop + disable service
if systemctl is-active --quiet nixpanel 2>/dev/null; then
  systemctl stop nixpanel
  echo "Stopped nixpanel service"
fi
if systemctl is-enabled --quiet nixpanel 2>/dev/null; then
  systemctl disable nixpanel
fi
rm -f /etc/systemd/system/nixpanel.service
systemctl daemon-reload
echo "Removed systemd service"

# Remove nginx vhost
rm -f /etc/nginx/sites-enabled/nixpanel.conf
rm -f /etc/nginx/sites-available/nixpanel.conf
nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
echo "Removed nginx config"

# Drop database
if command -v mariadb &>/dev/null; then
  mariadb -u root 2>/dev/null <<SQL || true
    DROP DATABASE IF EXISTS \`nixpanel\`;
    DROP USER IF EXISTS 'nixpanel'@'localhost';
    FLUSH PRIVILEGES;
SQL
  echo "Dropped nixpanel database and user"
fi

# Remove install directory
if [[ -d "$INSTALL_DIR" ]]; then
  rm -rf "$INSTALL_DIR"
  echo "Removed $INSTALL_DIR"
fi

# Remove credentials file
rm -f /root/.nixpanel_credentials

echo ""
echo -e "${BOLD}NixPanel has been uninstalled.${RESET}"
echo ""
