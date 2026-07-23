/**
 * Structured request logging for machine-consumer endpoints.
 * One JSON line per request → queryable in Vercel's log explorer
 * (filter on `asb_consumer`) to see who consumes the catalog, how often,
 * and which MCP tools they call.
 */

export function logConsumer(
  route: string,
  req: Request,
  extra: Record<string, unknown> = {}
): void {
  try {
    console.log(
      JSON.stringify({
        asb_consumer: true,
        route,
        ua: req.headers.get('user-agent') ?? 'unknown',
        referer: req.headers.get('referer') ?? undefined,
        ...extra,
      })
    );
  } catch {
    // logging must never break the request
  }
}
