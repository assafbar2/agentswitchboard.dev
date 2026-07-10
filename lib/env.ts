/**
 * Fail-fast env validation with actionable errors.
 * Delivery-side vars are required for the site to render;
 * management/preview vars are only required by the code paths that use them.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in (or set it in Vercel).`
    );
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
