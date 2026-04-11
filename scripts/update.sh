#!/usr/bin/env bash
# NixPanel updater — pulls latest code and rebuilds
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━  $*  ━━━${RESET}"; }

[[ $EUID -ne 0 ]] && error "Must be run as root"

INSTALL_DIR="${1:-/opt/nixpanel}"
[[ -d "$INSTALL_DIR/.git" ]] || error "NixPanel not found at $INSTALL_DIR"

step "Pulling latest code"
git -C "$INSTALL_DIR" pull --ff-only
success "Code updated"

step "Installing dependencies"
cd "$INSTALL_DIR"
npm install --workspaces --include-workspace-root --silent
success "Dependencies ready"

step "Running migrations"
cd "$INSTALL_DIR/server"
npx prisma generate
npx prisma db push
success "Migrations applied"

step "Rebuilding frontends"
cd "$INSTALL_DIR"
npm run build --workspace=nixserver --silent
npm run build --workspace=nixclient --silent
# Ensure Apache (www-data) can read the rebuilt assets
chmod 755 "$INSTALL_DIR/nixserver" "$INSTALL_DIR/nixclient"
find "$INSTALL_DIR/nixserver/dist" -type d -exec chmod 755 {} \;
find "$INSTALL_DIR/nixserver/dist" -type f -exec chmod 644 {} \;
find "$INSTALL_DIR/nixclient/dist" -type d -exec chmod 755 {} \;
find "$INSTALL_DIR/nixclient/dist" -type f -exec chmod 644 {} \;
success "Frontends rebuilt"

step "Rebuilding server"
cd "$INSTALL_DIR/server"
npm run build --silent 2>/dev/null || npx tsc 2>/dev/null || true
success "Server rebuilt"

step "Restarting service"
systemctl restart nixpanel
sleep 3
systemctl is-active nixpanel && success "nixpanel restarted" || error "nixpanel failed to start — check: journalctl -u nixpanel -n 50"

echo ""
echo -e "${BOLD}${GREEN}NixPanel updated successfully!${RESET}"
echo ""
