#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_dir="${project_root}/cpanel-deploy"
archive_path="${project_root}/cpanel-deploy-passenger.zip"
prepare_cpanel_temp_root=""
prepare_cpanel_pending_archive=""

cleanup() {
  if [[ -n "${prepare_cpanel_temp_root}" && -d "${prepare_cpanel_temp_root}" ]]; then
    rm -rf -- "${prepare_cpanel_temp_root}"
  fi

  if [[ -n "${prepare_cpanel_pending_archive}" && -f "${prepare_cpanel_pending_archive}" ]]; then
    rm -f -- "${prepare_cpanel_pending_archive}"
  fi
}

require_command() {
  local command_name="$1"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command not found: ${command_name}" >&2
    return 1
  fi
}

validate_deploy_origin() {
  local deploy_origin="$1"

  if [[ ! "${deploy_origin}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
    echo "DEPLOY_SITE_ORIGIN must be a valid HTTPS origin without a path." >&2
    return 1
  fi
}

validate_sharp_platform_packages() {
  local node_modules_dir="$1"
  local package_path
  local package_name
  local package_parent

  if [[ ! -d "${node_modules_dir}" ]]; then
    echo "Missing node_modules directory: ${node_modules_dir}" >&2
    return 1
  fi

  while IFS= read -r -d '' package_path; do
    package_parent="${package_path%/*}"
    [[ "${package_parent##*/}" == "@img" ]] || continue

    package_name="${package_path##*/}"
    case "${package_name}" in
      sharp-linux-x64 | sharp-linuxmusl-x64 | sharp-libvips-linux-x64 | sharp-libvips-linuxmusl-x64 | sharp-wasm32)
        ;;
      *)
        echo "Unsupported Sharp native package in bundle: @img/${package_name}" >&2
        return 1
        ;;
    esac
  done < <(find "${node_modules_dir}" \( -type d -o -type l \) -name 'sharp-*' -print0)
}

create_clean_checkout() {
  local checkout_dir="$1"

  mkdir -p "${checkout_dir}"
  git -C "${project_root}" archive --format=tar HEAD | tar -xf - -C "${checkout_dir}"

  if [[ -f "${project_root}/.env.local" ]]; then
    cp "${project_root}/.env.local" "${checkout_dir}/.env.local"
  fi
}

build_clean_checkout() {
  local checkout_dir="$1"
  local deploy_origin="$2"

  (
    cd "${checkout_dir}"
    npm ci
    validate_sharp_platform_packages "${checkout_dir}/node_modules"
    PUBLIC_SITE_ORIGIN="${deploy_origin}" \
      NEXT_PUBLIC_SITE_ORIGIN="${deploy_origin}" \
      npm run build
  )

  if [[ ! -f "${checkout_dir}/.next/standalone/server.js" ]]; then
    echo "Missing .next/standalone/server.js; commit output: standalone in next.config.ts before packaging." >&2
    return 1
  fi

  validate_sharp_platform_packages "${checkout_dir}/.next/standalone/node_modules"
}

materialize_passenger_bundle() {
  local checkout_dir="$1"
  local bundle_dir="$2"

  if [[ ! -d "${checkout_dir}/.next/static" || ! -d "${checkout_dir}/public" ]]; then
    echo "Missing .next/static or public assets after build." >&2
    return 1
  fi

  mkdir -p "${bundle_dir}/.next"
  cp -aL "${checkout_dir}/.next/standalone/." "${bundle_dir}/"
  cp -a "${checkout_dir}/.next/static" "${bundle_dir}/.next/static"
  cp -a "${checkout_dir}/public" "${bundle_dir}/public"
}

validate_archive() {
  local candidate_archive="$1"
  local listing_path="$2"
  local required_key
  local required_prefix

  unzip -tqq "${candidate_archive}"
  unzip -Z1 "${candidate_archive}" >"${listing_path}"

  for required_key in server.js package.json; do
    if ! grep -Fqx "${required_key}" "${listing_path}"; then
      echo "Archive is missing required key: ${required_key}" >&2
      return 1
    fi
  done

  for required_prefix in '.next/' 'node_modules/' 'public/'; do
    if ! grep -Fqx "${required_prefix}" "${listing_path}"; then
      echo "Archive is missing required prefix: ${required_prefix}" >&2
      return 1
    fi
  done

  if grep -Eq '(^|/)\.env[^/]*(/|$)|(^|/)\.git(/|$)|\.(tar|tar\.gz|tar\.bz2|tar\.xz|tgz)$' "${listing_path}"; then
    echo "Archive contains an environment file, Git metadata, or source tarball." >&2
    return 1
  fi

  if grep -Eq '^(src|app|components|lib|tests)/|^node_modules/(\.bin/|\.cache/|\.package-lock\.json$)' "${listing_path}"; then
    echo "Archive contains source folders or the build-time node_modules tree." >&2
    return 1
  fi
}

publish_bundle() {
  local bundle_dir="$1"
  local candidate_archive="$2"

  prepare_cpanel_pending_archive="${archive_path}.tmp.$$"
  cp "${candidate_archive}" "${prepare_cpanel_pending_archive}"

  rm -rf -- "${deploy_dir}"
  mv "${bundle_dir}" "${deploy_dir}"

  mv -f -- "${prepare_cpanel_pending_archive}" "${archive_path}"
  prepare_cpanel_pending_archive=""
}

main() {
  local checkout_dir
  local bundle_dir
  local candidate_archive
  local archive_listing
  local command_name
  local deploy_origin="${DEPLOY_SITE_ORIGIN:-https://test.naturalfarmingvietnam.com}"

  validate_deploy_origin "${deploy_origin}"
  for command_name in git tar npm zip unzip; do
    require_command "${command_name}"
  done

  prepare_cpanel_temp_root="$(mktemp -d "${TMPDIR:-/tmp}/frontend-v1-cpanel.XXXXXX")"
  trap cleanup EXIT

  checkout_dir="${prepare_cpanel_temp_root}/source"
  bundle_dir="${prepare_cpanel_temp_root}/bundle"
  candidate_archive="${prepare_cpanel_temp_root}/cpanel-deploy-passenger.zip"
  archive_listing="${prepare_cpanel_temp_root}/archive-entries.txt"

  echo "Creating a clean checkout from git archive HEAD..."
  create_clean_checkout "${checkout_dir}"

  echo "Installing with npm ci and building for ${deploy_origin}..."
  build_clean_checkout "${checkout_dir}" "${deploy_origin}"

  echo "Preparing and validating the cPanel Passenger bundle..."
  materialize_passenger_bundle "${checkout_dir}" "${bundle_dir}"
  validate_sharp_platform_packages "${bundle_dir}/node_modules"
  (
    cd "${bundle_dir}"
    zip -qr "${candidate_archive}" .
  )
  validate_archive "${candidate_archive}" "${archive_listing}"

  publish_bundle "${bundle_dir}" "${candidate_archive}"
  echo "Created ${archive_path}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
