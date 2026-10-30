#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source="${1:?Usage: bash restore.sh /absolute/backup/path --confirm-empty-target}"
[[ "${2:-}" == '--confirm-empty-target' ]] || { echo 'Restore only to a fresh, isolated compose project.' >&2; exit 1; }
[[ "$(cat "$source/format.txt")" == 'omnicard-backup-v1' ]] || exit 1
(cd "$source" && sha256sum --check checksums.txt)
# A complete restore is an operator action. Never overwrite an existing library.
docker compose up -d db
for attempt in {1..30}; do
  docker compose exec -T db pg_isready -U omnicard -d omnicard && break
  sleep 2
done
tables=$(docker compose exec -T db psql -U omnicard -d omnicard -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
[[ "$tables" == '0' ]] || { echo 'Target database is not empty; refusing restore.' >&2; exit 1; }
docker compose run --rm --no-deps -T api python -c 'from pathlib import Path; import sys; p=Path("/data/images"); sys.exit("Target image directory is not empty") if p.exists() and any(p.iterdir()) else None'
# Validate the archive before extraction. Do not accept links or paths outside images/.
docker compose run --rm --no-deps -T api python -c 'import sys,tarfile; t=tarfile.open(fileobj=sys.stdin.buffer,mode="r|"); [(None if (m.name == "images" or m.name.startswith("images/")) and ".." not in m.name.split("/") and (m.isdir() or m.isfile()) else sys.exit("Unsafe archive")) for m in t]' < "$source/images.tar"
docker compose exec -T db pg_restore -U omnicard -d omnicard --no-owner --exit-on-error --single-transaction < "$source/database.dump"
docker compose run --rm --no-deps -T api tar -C /data -xf - < "$source/images.tar"
docker compose exec -T db psql -U omnicard -d omnicard -c 'DELETE FROM sessions;'
echo 'Restored. Run migrations, then verify the library before enabling web traffic.'
