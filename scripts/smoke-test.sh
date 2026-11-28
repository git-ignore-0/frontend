#!/usr/bin/env bash
set -euo pipefail

test_origin=https://test.naturalfarmingvietnam.com
smoke_root="$(mktemp -d)"
trap 'rm -rf -- "$smoke_root"' EXIT

probe() {
  local output="$1"
  shift
  curl --silent --show-error --max-time 30 --output "$output" \
    --write-out '%{http_code}\n%{content_type}\n%{redirect_url}\n' "$@"
}

wait_for_homepage() {
  local attempts=7 attempt metadata content_type marker
  local -a response
  for (( attempt=1; attempt<=attempts; attempt++ )); do
    if metadata="$(probe "$smoke_root/home.html" "$test_origin/vi")"; then
      mapfile -t response <<<"$metadata"
      content_type="${response[1]:-}"
      marker=missing
      if grep -Fq '/_next/static/' "$smoke_root/home.html"; then
        marker=present
      fi
      if [[ "${response[0]}" == 200 && "${content_type%%;*}" == text/html && "$marker" == present ]]; then
        printf 'FEv1 home page is ready (attempt %s/%s).\n' "$attempt" "$attempts"
        return 0
      fi
      printf 'FEv1 /vi attempt %s/%s: HTTP %s, content type=%q, redirect=%q, Next.js asset marker=%s.\n' \
        "$attempt" "$attempts" "${response[0]}" "${content_type:-none}" "${response[2]:-none}" "$marker" >&2
    else
      printf 'FEv1 /vi attempt %s/%s: curl exited with code %s.\n' "$attempt" "$attempts" "$?" >&2
    fi
    if (( attempt < attempts )); then
      sleep 10
    fi
  done
  echo 'FEv1 home page readiness timed out waiting for HTTP 200 with Next.js HTML.' >&2
  return 1
}

# An install receipt only signals that the worker requested the Passenger restart.
wait_for_homepage

if ! metadata="$(probe "$smoke_root/settings.json" --fail --retry 6 --retry-delay 10 \
  --retry-all-errors "$test_origin/api/site-settings?locale=vi")"; then
  echo 'FEv1 site-settings smoke failed: could not retrieve /api/site-settings?locale=vi.' >&2
  exit 1
fi
mapfile -t response <<<"$metadata"
content_type="${response[1]:-}"
if [[ "${response[0]}" != 200 || "${content_type%%;*}" != application/json ]]; then
  printf 'FEv1 site-settings smoke failed: HTTP %s, content type=%q, redirect=%q.\n' \
    "${response[0]}" "${content_type:-none}" "${response[2]:-none}" >&2
  exit 1
fi

if ! node --input-type=module - "$smoke_root/settings.json" <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
const settings = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert(settings && typeof settings === 'object', 'FEv1 could not load backend settings');
assert.equal(typeof settings.is_email_enabled, 'boolean');
assert.equal(typeof settings.is_phone_enabled, 'boolean');
assert(Array.isArray(settings.links), 'Invalid settings response');
JS
then
  echo 'FEv1 site-settings smoke failed: invalid JSON or settings payload. Check the Content API configuration and upstream response.' >&2
  exit 1
fi
echo 'FEv1 site settings are valid.'
