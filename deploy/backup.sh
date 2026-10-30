#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
destination="${1:?Usage: bash backup.sh /absolute/path/to/new-backup-directory}"
if [[ "$destination" != /* || -e "$destination" ]]; then
  echo "Choose a new absolute backup directory (existing files are never overwritten)." >&2
  exit 1
fi
mkdir -p "$destination"
docker compose stop web api worker
trap 'docker compose start api worker web' EXIT
docker compose exec -T db pg_dump -U omnicard -d omnicard -Fc > "$destination/database.dump"
docker compose run --rm --no-deps -T api tar -C /data -cf - images > "$destination/images.tar"
printf '%s\n' 'omnicard-backup-v1' > "$destination/format.txt"
(cd "$destination" && sha256sum database.dump images.tar > checksums.txt)
echo "Backup complete. Contains personal data and password hashes; keep access restricted."
