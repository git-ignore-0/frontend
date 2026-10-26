#!/usr/bin/env bash

set -euo pipefail

readonly test_project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly fixture_root="$(mktemp -d)"
trap 'rm -rf "${fixture_root}"' EXIT

# shellcheck source=/dev/null
source "${test_project_root}/prepare-cpanel-deploy.sh"

make_sharp_package() {
  local node_modules_dir="$1"
  local package_name="$2"

  mkdir -p "${node_modules_dir}/@img/${package_name}"
}

readonly allowed_node_modules="${fixture_root}/allowed/node_modules"
for package_name in \
  sharp-linux-x64 \
  sharp-linuxmusl-x64 \
  sharp-libvips-linux-x64 \
  sharp-libvips-linuxmusl-x64 \
  sharp-wasm32; do
  make_sharp_package "${allowed_node_modules}" "${package_name}"
done
validate_sharp_platform_packages "${allowed_node_modules}"

for package_name in sharp-win32-x64 sharp-darwin-x64 sharp-linux-arm64; do
  invalid_node_modules="${fixture_root}/${package_name}/node_modules"
  make_sharp_package "${invalid_node_modules}" "${package_name}"
  if validate_sharp_platform_packages "${invalid_node_modules}" >/dev/null 2>&1; then
    echo "Expected @img/${package_name} to be rejected." >&2
    exit 1
  fi
done

validate_deploy_origin "https://test.naturalfarmingvietnam.com"
if validate_deploy_origin "https://test.naturalfarmingvietnam.com/path" >/dev/null 2>&1; then
  echo "Expected an origin containing a path to be rejected." >&2
  exit 1
fi

echo "Clean cPanel packaging validation passed."
