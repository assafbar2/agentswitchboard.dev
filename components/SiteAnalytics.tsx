'use client';

import { Analytics } from '@vercel/analytics/react';
import { withoutTypedText } from '@/lib/analytics';

export function SiteAnalytics() {
  return <Analytics beforeSend={withoutTypedText} />;
}
