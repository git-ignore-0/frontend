/**
 * UI-only by default. Enable session requests only once authentication routes
 * are deployed on the SAME origin as the app. Never use this as authorization.
 */
export const SESSION_ENABLED = (process.env.NEXT_PUBLIC_SESSION_ENABLED ?? process.env.NEXT_PUBLIC_V2_SESSION_ENABLED) === "true";
