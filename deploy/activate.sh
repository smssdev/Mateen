#!/usr/bin/env bash
#
# Runs on the server (piped in by deploy.sh). Points `current` at the new release in one atomic step and keeps the
# five newest releases for rollbacks. The site's document root is $APP_DIR/current.
set -euo pipefail

: "${APP_DIR:?}" "${RELEASE:?}"
case "$RELEASE" in
    "$APP_DIR"/releases/*) ;;
    *) echo "Release must be under $APP_DIR/releases." >&2; exit 1 ;;
esac
[[ -f "$RELEASE/index.html" ]] || { echo "$RELEASE has no index.html." >&2; exit 1; }

chmod -R u=rwX,go=rX "$RELEASE"
ln -sfn "$RELEASE" "$APP_DIR/current.tmp"
mv -Tf "$APP_DIR/current.tmp" "$APP_DIR/current"

cd "$APP_DIR/releases"
ls -1dt -- */ | tail -n +6 | xargs -r rm -rf --

echo "Live release: $RELEASE"
