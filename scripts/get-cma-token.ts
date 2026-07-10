/**
 * Generates a fresh Contentful CMA token using App Identity.
 *
 * This bypasses the CFPAT restriction on your account by using
 * a Contentful App with a signed JWT to get an access token.
 *
 * Run: npx tsx scripts/get-cma-token.ts
 *
 * The token is valid for 10 minutes. The script can be run anytime
 * to get a fresh one.
 *
 * SECURITY: the RSA private key lives in .env.local (gitignored) as
 * CONTENTFUL_APP_PRIVATE_KEY_B64 — base64 of the PEM file:
 *   base64 < private-key.pem | tr -d '\n'
 * It must never be committed to source. If you believe the key was
 * exposed, rotate it: Contentful → Apps → App definition → Key pairs.
 */

import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const APP_DEF_ID = '6nEGGedWHMLKcYtuDw91dx';
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID || '8e4hmp8gwcuv';
const KEY_ID = 'JfoHYIpuEPiGUhgmmhD-WS9xUnhQE6iGQISZsLW-shY';

function getPrivateKey(): string {
  const b64 = process.env.CONTENTFUL_APP_PRIVATE_KEY_B64;
  if (!b64) {
    throw new Error(
      'CONTENTFUL_APP_PRIVATE_KEY_B64 is not set. Add it to .env.local ' +
        '(base64 of the App Identity private key PEM). See .env.example.'
    );
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

async function getAppToken(): Promise<string> {
  // Sign JWT — issuer must be the App Definition ID, payload is empty
  const signedJwt = jwt.sign({}, getPrivateKey(), {
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
