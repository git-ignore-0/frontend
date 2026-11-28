#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT
mkdir -p "$test_root/bin"

cat >"$test_root/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
while (( $# )); do
  case "$1" in
    --output) output="$2"; shift ;;
    --write-out) write_out="$2"; shift ;;
    --max-time|--retry|--retry-delay) shift ;;
    https://test.naturalfarmingvietnam.com/*) url="$1" ;;
  esac
  shift
done
printf '%s\n' "${url#https://test.naturalfarmingvietnam.com}" >>"$SMOKE_TEST_FIXTURES/calls"
call="$(wc -l <"$SMOKE_TEST_FIXTURES/calls")"
fixture="$(sed -n "${call}p" "$SMOKE_TEST_FIXTURES/responses")"
[[ -n "$fixture" ]] || exit 99
IFS='|' read -r status content_type redirect body <<<"$fixture"
printf '%s\n' "$body" >"$output"
if [[ -n "${write_out:-}" ]]; then
  printf '%s\n%s\n%s\n' "$status" "$content_type" "$redirect"
fi
MOCK

cat >"$test_root/bin/sleep" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$1" >>"$SMOKE_TEST_FIXTURES/sleeps"
MOCK
chmod +x "$test_root/bin/curl" "$test_root/bin/sleep"
export PATH="$test_root/bin:$PATH"
export RUNNER_TEMP="$test_root"
export SMOKE_TEST_FIXTURES="$test_root"

reset_probe() {
  : >"$test_root/calls"
  : >"$test_root/sleeps"
}

run_smoke() {
  bash -e "${SMOKE_SCRIPT_UNDER_TEST:-$project_root/scripts/smoke-test.sh}" >"$test_root/smoke.log" 2>&1
}

placeholder='200|text/html; charset=utf-8||<title>Starting</title>'
homepage='200|text/html; charset=utf-8||<script src="/_next/static/runtime.js"></script>'
settings='200|application/json||{"is_email_enabled":true,"is_phone_enabled":false,"links":[]}'

reset_probe
cat >"$test_root/responses" <<EOF
$placeholder
302|text/html|https://test.naturalfarmingvietnam.com/starting|/_next/static/runtime.js
200|text/plain||/_next/static/runtime.js
503|text/html||/_next/static/runtime.js
$homepage
$settings
EOF
if ! run_smoke; then
  echo 'Expected to retry until /vi serves Next HTML and then validate site settings.' >&2
  cat "$test_root/smoke.log" >&2
  exit 1
fi
diff -u <(printf '%s\n' /vi /vi /vi /vi /vi '/api/site-settings?locale=vi') "$test_root/calls"
diff -u <(printf '10\n10\n10\n10\n') "$test_root/sleeps"
grep -Fq 'HTTP 302' "$test_root/smoke.log"
grep -Fq 'https://test.naturalfarmingvietnam.com/starting' "$test_root/smoke.log"
grep -Fq 'text/plain' "$test_root/smoke.log"
grep -Fq 'HTTP 503' "$test_root/smoke.log"
echo 'FEv1 retries the full home page readiness check.'

reset_probe
printf '%s\n' "$placeholder" "$placeholder" "$placeholder" "$placeholder" \
  "$placeholder" "$placeholder" "$placeholder" >"$test_root/responses"
if run_smoke; then
  echo 'Expected the readiness check to fail after seven unsuccessful requests.' >&2
  exit 1
fi
diff -u <(printf '%s\n' /vi /vi /vi /vi /vi /vi /vi) "$test_root/calls"
diff -u <(printf '10\n10\n10\n10\n10\n10\n') "$test_root/sleeps"
grep -Fq 'Next.js asset marker=missing' "$test_root/smoke.log"
grep -Fq 'FEv1 home page readiness timed out' "$test_root/smoke.log"
echo 'FEv1 times out when the home page never becomes ready.'

reset_probe
printf '%s\n' "$homepage" '200|application/json||null' >"$test_root/responses"
if run_smoke; then
  echo 'Expected invalid site settings to fail after the home page became ready.' >&2
  exit 1
fi
diff -u <(printf '%s\n' /vi '/api/site-settings?locale=vi') "$test_root/calls"
test ! -s "$test_root/sleeps"
grep -Fq 'FEv1 site-settings smoke failed' "$test_root/smoke.log"
echo 'FEv1 reports invalid site settings separately.'
