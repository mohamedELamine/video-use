#!/bin/sh
# PROTOTYPE (#11). Links the Sooq Pro media this prototype reads but does not own.
set -e
cd "$(dirname "$0")"
REELS="${REELS:-$HOME/Local Sites/soqpro/marketing/reels-assets}"
[ -e public/reels ] || ln -s "$REELS" public/reels
[ -d node_modules ] || npm ci
