import type { ComponentProps } from 'react';

/**
 * A link to an API route or a machine-readable doc. Deliberately not
 * next/link: that prefetches the target whenever the link is in view, and
 * proxy.ts, which counts doc reads, cannot tell a prefetch from a read
 * because Next strips the router's headers before the proxy runs.
 */
export function EndpointLink(props: ComponentProps<'a'>) {
  return <a {...props} />;
}
