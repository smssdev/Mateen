#!/usr/bin/env bash
#
# Builds the site for https://hafiz.smszs.tech and ships it to your own server, the same way Orbit is deployed:
# upload into a new directory under releases/, then switch the `current` symlink to it in one atomic step.
#
#   deploy/deploy.sh hafiz@2.24.47.100
#
# Optional environment: DOMAIN (default hafiz.smszs.tech), APP_DIR (default /home/hafiz/htdocs/hafiz.smszs.tech),
# SSH_PORT (default 22), SKIP_BUILD=1 to upload an existing dist/.
set -euo pipefail

TARGET="${1:?Usage: deploy/deploy.sh <ssh user>@<server>}"
DOMAIN="${DOMAIN:-hafiz.smszs.tech}"
APP_DIR="${APP_DIR:-/home/hafiz/htdocs/$DOMAIN}"
SSH_PORT="${SSH_PORT:-22}"
cd "$(dirname "$0")/.."

if [[ "${SKIP_BUILD:-}" != 1 ]]; then
    echo "==> Build for https://$DOMAIN/"
    BASE=/ VITE_SITE_URL="https://$DOMAIN/" npm run build
fi
[[ -f dist/index.html && -f dist/app/index.html ]] || { echo "dist/ is incomplete; run the build first." >&2; exit 1; }

sha="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
release="$APP_DIR/releases/$(date -u +%Y%m%d%H%M%S)-$sha"
ssh=(ssh -p "$SSH_PORT" -o BatchMode=yes)

echo "==> Upload to $TARGET:$release"
"${ssh[@]}" "$TARGET" "mkdir -p '$release'"
rsync -az --delete -e "ssh -p $SSH_PORT -o BatchMode=yes" dist/ "$TARGET:$release/"

echo "==> Activate"
"${ssh[@]}" "$TARGET" "APP_DIR='$APP_DIR' RELEASE='$release' bash -s" < deploy/activate.sh

echo "==> Check"
curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors -o /dev/null "https://$DOMAIN/app/" \
    && echo "Live: https://$DOMAIN/"
