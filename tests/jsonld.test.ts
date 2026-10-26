import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from '@/components/JsonLd';

describe('serializeJsonLd', () => {
  it('escapes "<" so catalog text cannot close the script tag', () => {
    const out = serializeJsonLd({ name: 'x</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(out).toContain('\\u003c/script>');
  });

  it('round-trips to the same data', () => {
    const schema = { '@type': 'SoftwareApplication', name: 'A <b> & "quoted" name' };
    expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
  });
});
