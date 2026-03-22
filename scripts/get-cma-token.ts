/**
 * Generates a fresh Contentful CMA token using App Identity.
 *
 * This bypasses the CFPAT restriction on your account by using
 * a Contentful App with a signed JWT to get an access token.
 *
 * Run: npx tsx scripts/get-cma-token.ts
 *
 * The token is valid for 10 minutes. The script can be run anytime
 * to get a fresh one — the private key never expires.
 */

import * as jwt from 'jsonwebtoken';

const APP_DEF_ID = '6nEGGedWHMLKcYtuDw91dx';
const SPACE_ID = '8e4hmp8gwcuv';
const KEY_ID = 'JfoHYIpuEPiGUhgmmhD-WS9xUnhQE6iGQISZsLW-shY';

const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`;

async function getAppToken(): Promise<string> {
  // Sign JWT — issuer must be the App Definition ID, payload is empty
  const signedJwt = jwt.sign({}, PRIVATE_KEY, {
    algorithm: 'RS256',
    issuer: APP_DEF_ID,
    expiresIn: '10m',
    keyid: KEY_ID,
  });

  // Correct endpoint: through app_installations, not app_access_tokens
  const endpoint = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master/app_installations/${APP_DEF_ID}/access_tokens`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      'Authorization': `Bearer ${signedJwt}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.token;
}

// When run directly, output the token
getAppToken()
  .then((token) => {
    console.log(token);
  })
  .catch((err) => {
    console.error('Failed to get token:', err.message);
    process.exit(1);
  });

export { getAppToken };
