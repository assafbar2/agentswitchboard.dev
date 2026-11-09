type Schema = Record<string, unknown> | Record<string, unknown>[];

/**
 * JSON.stringify does not escape "<", so catalog text containing
 * "</script>" could close the tag early and inject markup. Every "<" is
 * written as its JSON escape \u003c instead, which parses back to
 * the same string, as the Next.js JSON-LD guide recommends.
 */
export function serializeJsonLd(schema: Schema): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

export function JsonLd({ schema }: { schema: Schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
