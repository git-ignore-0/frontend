import "server-only";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function requiredOrigin(name: string): string {
  let url: URL;
  try {
    url = new URL(required(name));
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, path or query`);
  }
  return url.origin;
}

export const authOrigin = () => requiredOrigin("AUTH_ORIGIN");
export const publicSiteOrigin = () => requiredOrigin("PUBLIC_SITE_ORIGIN");
export const oauthClientId = () => required("PUBLIC_OAUTH_CLIENT_ID");
export const oauthClientSecret = () => required("PUBLIC_OAUTH_CLIENT_SECRET");
export function sessionSecret(): string {
  const value = required("PUBLIC_SESSION_SECRET");
  if (value.length < 32) throw new Error("PUBLIC_SESSION_SECRET must be at least 32 characters");
  return value;
}
