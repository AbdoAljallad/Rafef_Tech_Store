#!/bin/sh
set -eu

ROOT="${RAFEEF_DEPLOY_ROOT:-/home/abdo/Rafef_Tech_Store}"
BRANCH="${RAFEEF_DEPLOY_BRANCH:-main}"

cd "$ROOT"

git fetch origin "$BRANCH"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already up to date: $LOCAL"
  exit 0
fi

git reset --hard "origin/$BRANCH"

docker compose up -d --build backend frontend caddy
docker compose exec -T backend npm run db:setup

echo "Deployed $REMOTE"
