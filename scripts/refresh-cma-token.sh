#!/bin/bash
# Refresh the CMA token in .env.local using App Identity (no manual token needed)
#
# Usage: ./scripts/refresh-cma-token.sh
#
# Uses the Contentful App Identity JWT flow — no browser required, no expiring CFW tokens.
# The private key is stored in scripts/get-cma-token.ts and never expires.

set -e

TOKEN=$(npx tsx scripts/get-cma-token.ts 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to generate token. Check scripts/get-cma-token.ts"
  exit 1
fi

# Test the token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://api.contentful.com/spaces/8e4hmp8gwcuv/environments/master/content_types?limit=1" \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" != "200" ]; then
  echo "❌ Token doesn't work (HTTP $STATUS)."
  exit 1
fi

# Update .env.local
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|CONTENTFUL_MANAGEMENT_TOKEN=.*|CONTENTFUL_MANAGEMENT_TOKEN=\"$TOKEN\"|" .env.local
else
  sed -i "s|CONTENTFUL_MANAGEMENT_TOKEN=.*|CONTENTFUL_MANAGEMENT_TOKEN=\"$TOKEN\"|" .env.local
fi

echo "✅ CMA token updated in .env.local (valid 10 minutes)"
echo "   Token: ${TOKEN:0:20}..."
