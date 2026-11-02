'use client';

/**
 * WebMCP — the in-page half of "this directory is an agent".
 *
 * Registers the catalog's tools (lib/webmcp-tools.ts) on `document.modelContext`
 * (W3C WebMCP API, polyfilled for browsers without native support) so an AI agent
 * looking at the page in a browser can call them directly, without scraping the DOM.
 *
 * Progressive enhancement: if WebMCP is unavailable or fails to init, this is
 * a silent no-op and the page is unaffected.
 */

import { useEffect } from 'react';
import { WEBMCP_TOOLS, type WebMcpTool } from '@/lib/webmcp-tools';

interface WebMcpRegistrar {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): Promise<void>;
}

export function WebMcp() {
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const { initializeWebMCPPolyfill } = await import('@mcp-b/webmcp-polyfill');
        initializeWebMCPPolyfill();

        const mc = (document as unknown as { modelContext?: WebMcpRegistrar }).modelContext;
        if (!mc || cancelled) return;

        for (const tool of WEBMCP_TOOLS) await mc.registerTool(tool, { signal: controller.signal });
      } catch {
        // WebMCP unavailable or failed to initialize — no-op.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return null;
}
