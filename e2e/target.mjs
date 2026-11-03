// The site the e2e checks run against: a local production build unless
// E2E_BASE_URL names a deployment.
export const PRODUCTION = 'https://agentswitchboard.dev';
export const LOCAL_PORT = 3100;
export const LOCAL = `http://localhost:${LOCAL_PORT}`;
export const BASE = (process.env.E2E_BASE_URL || LOCAL).replace(/\/+$/, '');
export const ON_PRODUCTION = new URL(BASE).host === new URL(PRODUCTION).host;
/** Production or a preview: Vercel's edge adds HSTS and applies vercel.json, which next start does not. */
export const ON_VERCEL = !['localhost', '127.0.0.1'].includes(new URL(BASE).hostname);
/**
 * Every request to a deployment counts against the Vercel team's origin
 * transfer, and a full run makes thousands. On a deployment only the smoke and
 * edge specs run, unless E2E_FULL=1.
 */
export const SMOKE_ONLY = ON_VERCEL && !process.env.E2E_FULL;
