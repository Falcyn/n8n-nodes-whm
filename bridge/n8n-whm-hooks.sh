#!/bin/bash
# ---------------------------------------------------------------------------
# n8n-whm-hooks.sh — install / register / remove the n8n hook bridge on a
# cPanel & WHM server. Run as root ON THE WHM SERVER.
#
#   ./n8n-whm-hooks.sh install [--url URL] [--secret SECRET]
#         Copies the bridge to /opt/n8n-whm-hook-bridge, writes the config
#         (if missing) and registers the DEFAULT_EVENTS below.
#   ./n8n-whm-hooks.sh add    <Category> <Event> [pre|post]
#   ./n8n-whm-hooks.sh remove <Category> <Event> [pre|post]
#   ./n8n-whm-hooks.sh list            Show every hook registered on the server
#   ./n8n-whm-hooks.sh uninstall       Deregister all bridge hooks, keep files
#
# Category::Event names are the ones from the cPanel "Guide to Standardized
# Hooks". For the Cpanel category the bridge is registered with
# --escalateprivs 1 so it runs as root and can read the config file.
# ---------------------------------------------------------------------------
set -euo pipefail

INSTALL_DIR="/opt/n8n-whm-hook-bridge"
SCRIPT_NAME="n8n-whm-hook-bridge.pl"
SCRIPT_PATH="$INSTALL_DIR/$SCRIPT_NAME"
CONF_PATH="/etc/n8n-whm-hook-bridge.conf"
MANAGE_HOOKS="/usr/local/cpanel/bin/manage_hooks"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Events registered by "install". Format: Category|Event|stage
DEFAULT_EVENTS=(
  "Whostmgr|Accounts::Create|post"
  "Whostmgr|Accounts::Remove|post"
  "Whostmgr|Accounts::Modify|post"
  "Whostmgr|Accounts::change_package|post"
  "Whostmgr|Accounts::suspendacct|post"
  "Whostmgr|Accounts::unsuspendacct|post"
  "Whostmgr|Domain::park|post"
  "Whostmgr|Domain::unpark|post"
  "Passwd|ChangePasswd|post"
  "Cpanel|UAPI::Email::add_pop|post"
  "Cpanel|UAPI::Email::delete_pop|post"
  "Cpanel|Api2::AddonDomain::addaddondomain|post"
  "Cpanel|Api2::AddonDomain::deladdondomain|post"
  "Cpanel|Api2::SubDomain::addsubdomain|post"
  "Cpanel|Api2::SubDomain::delsubdomain|post"
  "Cpanel|UAPI::Mysql::create_database|post"
  "Cpanel|UAPI::Ftp::add_ftp|post"
)

die() { echo "error: $*" >&2; exit 1; }

need_root() { [[ $EUID -eq 0 ]] || die "run this script as root on the WHM server"; }
need_manage_hooks() { [[ -x "$MANAGE_HOOKS" ]] || die "$MANAGE_HOOKS not found — is this a cPanel & WHM server?"; }

hook_args() {
  # $1 category, $2 event, $3 stage
  local args=(--manual --category "$1" --event "$2" --stage "$3")
  [[ "$1" == "Cpanel" ]] && args+=(--escalateprivs 1)
  printf '%s\n' "${args[@]}"
}

add_hook() {
  local category="$1" event="$2" stage="${3:-post}"
  mapfile -t args < <(hook_args "$category" "$event" "$stage")
  echo "+ registering $category::$event ($stage)"
  "$MANAGE_HOOKS" add script "$SCRIPT_PATH" "${args[@]}"
}

remove_hook() {
  local category="$1" event="$2" stage="${3:-post}"
  mapfile -t args < <(hook_args "$category" "$event" "$stage")
  echo "- removing $category::$event ($stage)"
  "$MANAGE_HOOKS" delete script "$SCRIPT_PATH" "${args[@]}" || true
}

write_config() {
  local url="$1" secret="$2"
  if [[ -f "$CONF_PATH" ]]; then
    echo "config $CONF_PATH already exists — leaving it untouched"
    return
  fi
  if [[ -z "$secret" ]]; then
    secret="$(head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48)"
    echo "generated a shared secret — copy it into the WHM Trigger node's Shared Secret field:"
    echo "    $secret"
  fi
  umask 077
  cat > "$CONF_PATH" <<EOF
# n8n hook bridge configuration — root only (mode 600)
webhook_url = ${url:-https://YOUR-N8N-HOST/webhook/REPLACE-ME/whm}
secret      = $secret
timeout     = 5
insecure    = 0
redact      = pass,password,passwd,pass1,pass2,key,db_pass,rawpass,newpass,oldpass
log         = /usr/local/cpanel/logs/n8n-whm-hook-bridge.log
EOF
  chmod 600 "$CONF_PATH"
  echo "wrote $CONF_PATH"
  [[ -n "$url" ]] || echo "NOTE: edit $CONF_PATH and set webhook_url to the WHM Trigger node's Production URL"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  install)
    need_root; need_manage_hooks
    url=""; secret=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --url)    url="$2"; shift 2 ;;
        --secret) secret="$2"; shift 2 ;;
        *) die "unknown option $1" ;;
      esac
    done
    [[ -f "$HERE/$SCRIPT_NAME" ]] || die "$SCRIPT_NAME not found next to this script"
    mkdir -p "$INSTALL_DIR"
    install -o root -g root -m 0700 "$HERE/$SCRIPT_NAME" "$SCRIPT_PATH"
    echo "installed $SCRIPT_PATH"
    write_config "$url" "$secret"
    for spec in "${DEFAULT_EVENTS[@]}"; do
      IFS='|' read -r category event stage <<< "$spec"
      add_hook "$category" "$event" "$stage"
    done
    echo
    echo "done. Test with:"
    echo "  echo '{\"context\":{},\"data\":{\"user\":\"test\"},\"hook\":{\"category\":\"Whostmgr\",\"event\":\"Accounts::Create\",\"stage\":\"post\"}}' | $SCRIPT_PATH"
    ;;
  add)
    need_root; need_manage_hooks
    [[ $# -ge 2 ]] || die "usage: $0 add <Category> <Event> [pre|post]"
    add_hook "$1" "$2" "${3:-post}"
    ;;
  remove)
    need_root; need_manage_hooks
    [[ $# -ge 2 ]] || die "usage: $0 remove <Category> <Event> [pre|post]"
    remove_hook "$1" "$2" "${3:-post}"
    ;;
  list)
    need_manage_hooks
    "$MANAGE_HOOKS" list
    ;;
  uninstall)
    need_root; need_manage_hooks
    for spec in "${DEFAULT_EVENTS[@]}"; do
      IFS='|' read -r category event stage <<< "$spec"
      remove_hook "$category" "$event" "$stage"
    done
    echo "bridge hooks removed. Files in $INSTALL_DIR and $CONF_PATH were kept; delete them by hand if no longer needed."
    echo "Hooks added with '$0 add' for events outside the default list must be removed with '$0 remove'."
    ;;
  *)
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
