#!/usr/bin/env bash
# Sync dist/ to the server with rsync. Run scripts/build.sh first.
#
# Required:
#   DEPLOY_HOST      server hostname
#   DEPLOY_PATH      absolute directory on the server (its contents are replaced)
# Optional:
#   DEPLOY_USER      ssh user (default: your ssh config / current user)
#   DEPLOY_PORT      ssh port
#   DEPLOY_KEY       path to an ssh private key
#   DEPLOY_DRY_RUN   set to 1 to only list what would change
set -euo pipefail

cd "$(dirname "$0")/.."

: "${DEPLOY_HOST:?set DEPLOY_HOST}"
: "${DEPLOY_PATH:?set DEPLOY_PATH}"

# --delete wipes files on the server that are not in dist/, so refuse risky targets.
case "$DEPLOY_PATH" in
    /*) ;;
    *) echo "DEPLOY_PATH must be absolute, got '$DEPLOY_PATH'" >&2; exit 1 ;;
esac
case "${DEPLOY_PATH%/}" in
    "" | /bin | /boot | /dev | /etc | /home | /lib | /opt | /root | /sbin | /usr | /var)
        echo "refusing to deploy over '$DEPLOY_PATH'" >&2; exit 1 ;;
esac

if [[ ! -f dist/index.html ]]; then
    echo "dist/ is missing or empty; run scripts/build.sh first" >&2
    exit 1
fi

ssh_cmd=(ssh)
[[ -n "${DEPLOY_PORT:-}" ]] && ssh_cmd+=(-p "$DEPLOY_PORT")
[[ -n "${DEPLOY_KEY:-}" ]] && ssh_cmd+=(-i "$DEPLOY_KEY" -o IdentitiesOnly=yes)

target="$DEPLOY_HOST"
[[ -n "${DEPLOY_USER:-}" ]] && target="$DEPLOY_USER@$DEPLOY_HOST"

args=(--archive --compress --delete --itemize-changes --human-readable)
[[ "${DEPLOY_DRY_RUN:-}" == "1" ]] && args+=(--dry-run)

# Trailing slash on the source copies the directory's contents, dotfiles included.
rsync "${args[@]}" -e "${ssh_cmd[*]}" dist/ "$target:${DEPLOY_PATH%/}/"
