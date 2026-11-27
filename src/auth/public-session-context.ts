export const PUBLIC_SESSION_HEADER = "X-NFV-Public-Session";
export const PUBLIC_SESSION_MARKER = "nfv_public_context";
export const GUEST_SESSION_BINDING = "guest";
export const PUBLIC_SESSION_RETIRED = "nfv_public_context_revoked_";

const familyId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function publicSessionMarker(cookie: string) {
  const cookies = new Map(cookie.split(";").map(entry => {
    const [name, value] = entry.trim().split("=", 2);
    return [name, value];
  }));
  const id = cookies.get(PUBLIC_SESSION_MARKER);
  const family = id && familyId.test(id) ? id : "legacy";
  return {family, retired: cookies.has(PUBLIC_SESSION_RETIRED + family)};
}

export function browserSessionEpoch(): string | null {
  if (typeof document === "undefined") return null;
  const {family, retired} = publicSessionMarker(document.cookie);
  return `${family}:${retired}`;
}

type PageSession = {binding: string; epoch: string | null};
let pageSession: PageSession | null = null;
let retired = false;
const listeners = new Set<() => void>();

/** A still-open page can retire its session, but cannot adopt a different login. */
export function verifyPageSession(binding: string, epoch: string | null): boolean {
  if (typeof document === "undefined") return true;
  if (retired || epoch !== browserSessionEpoch() || (pageSession && pageSession.binding !== binding)) {
    retirePageSession();
    return false;
  }
  pageSession ??= {binding, epoch};
  if (isPageSessionCurrent(pageSession)) return true;
  retirePageSession();
  return false;
}

export function capturePageSession() {
  return pageSession;
}

export function isPageSessionCurrent(expected: PageSession | null) {
  if (retired || !expected || expected !== pageSession || expected.epoch !== browserSessionEpoch()) return false;
  return !familyId.test(expected.binding) || !document.cookie.split(";")
    .some(entry=>entry.trim().startsWith(`${PUBLIC_SESSION_RETIRED}${expected.binding}=`));
}

export function retirePageSession(expected = pageSession) {
  if (retired || expected !== pageSession) return;
  retired = true;
  listeners.forEach(listener => listener());
}

export function onPageSessionRetired(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
