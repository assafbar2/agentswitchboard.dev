/**
 * CI lock-in for static machine manifests against live runtime code:
 *   1. public/.well-known/webmcp.json <-> lib/webmcp-tools.ts (WEBMCP_TOOLS)
 *   2. public/.well-known/mcp.json & server.json <-> live /api/mcp registry
 *   3. public/openapi.json schemas <-> live REST route outputs, including
 *      organic-only DecisionAgent & TaskAgent (no featured/sponsored) and 110/min 429s.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { POST as mcpPost } from '@/app/api/[transport]/route';
import { GET as agentsRoute } from '@/app/api/agents/route';
import { GET as agentRoute } from '@/app/api/agents/[slug]/route';
import { GET as alternativesRoute } from '@/app/api/agents/[slug]/alternatives/route';
import { GET as bundleRoute } from '@/app/api/bundle/route';
import { GET as categoriesRoute } from '@/app/api/categories/route';
import { GET as compareRoute } from '@/app/api/compare/route';
import { GET as recommendRoute } from '@/app/api/recommend/route';
import { GET as stacksRoute } from '@/app/api/stacks/route';
import { GET as stackRoute } from '@/app/api/stacks/[slug]/route';
import { GET as tasksRoute } from '@/app/api/tasks/route';
import { GET as taskRoute } from '@/app/api/tasks/[slug]/route';
import { REST_REQUESTS_PER_MINUTE } from '@/lib/rest-rate-limit';
import { WEBMCP_TOOLS } from '@/lib/webmcp-tools';

type JsonObject = Record<string, unknown>;

function readJson(relPath: string): JsonObject {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')) as JsonObject;
}

let rpcId = 0;
async function mcpRpc(method: string, params: JsonObject = {}) {
  const res = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'x-forwarded-for': `198.51.101.${(rpcId % 250) + 1}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    })
  );
  const text = await res.text();
  const data = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .pop();
  return JSON.parse(data ? data.slice(5) : text);
}

/** Resolve JSON Pointer refs inside OpenAPI and merge `allOf` object properties/required. */
function resolveSchema(doc: JsonObject, raw: unknown): JsonObject {
  if (!raw || typeof raw !== 'object') return {};
  const schema = raw as JsonObject;
  if (typeof schema.$ref === 'string') {
    const parts = schema.$ref.replace(/^#\//, '').split('/');
    let cur: unknown = doc;
    for (const part of parts) cur = (cur as JsonObject)[part];
    return resolveSchema(doc, cur);
  }
  if (Array.isArray(schema.allOf)) {
    const mergedProps: JsonObject = {};
    const mergedRequired = new Set<string>();
    for (const sub of schema.allOf) {
      const r = resolveSchema(doc, sub);
      if (r.properties && typeof r.properties === 'object') {
        Object.assign(mergedProps, r.properties as JsonObject);
      }
      if (Array.isArray(r.required)) {
        for (const k of r.required) mergedRequired.add(String(k));
      }
    }
    return {
      type: 'object',
      required: [...mergedRequired],
      properties: mergedProps,
    };
  }
  return schema;
}

function matchesType(value: unknown, expected: string): boolean {
  if (expected === 'null') return value === null;
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expected === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === expected;
}

function validateAgainstOpenApi(doc: JsonObject, rawSchema: unknown, value: unknown, at = '$'): string[] {
  const schema = resolveSchema(doc, rawSchema);
  if (Array.isArray(schema.oneOf)) {
    const ok = schema.oneOf.some((branch) => validateAgainstOpenApi(doc, branch, value, at).length === 0);
    return ok ? [] : [`${at}: matched none of oneOf branches`];
  }

  const errors: string[] = [];
  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? (schema.type as string[]) : [String(schema.type)];
    if (!allowed.some((t) => matchesType(value, t))) {
      return [`${at}: expected type ${allowed.join('|')}, got ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`];
    }
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${at}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${at}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) => {
      errors.push(...validateAgainstOpenApi(doc, schema.items, item, `${at}[${i}]`));
    });
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as JsonObject;
    const props = (schema.properties ?? {}) as JsonObject;
    const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
    for (const key of required) {
      if (!(key in obj)) errors.push(`${at}: missing required property "${key}"`);
    }
    if (Object.keys(props).length > 0 && !schema.additionalProperties) {
      for (const key of Object.keys(obj)) {
        if (!(key in props)) errors.push(`${at}: unexpected property "${key}" not declared in OpenAPI schema`);
      }
    }
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj) {
        errors.push(...validateAgainstOpenApi(doc, propSchema, obj[key], `${at}.${key}`));
      }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        if (!(key in props)) {
          errors.push(...validateAgainstOpenApi(doc, schema.additionalProperties, val, `${at}.${key}`));
        }
      }
    }
  }
  return errors;
}

describe('WebMCP manifest parity (public/.well-known/webmcp.json <-> WEBMCP_TOOLS)', () => {
  it('matches WEBMCP_TOOLS declarations and live MCP server version exactly', async () => {
    const manifest = readJson('public/.well-known/webmcp.json');
    const init = await mcpRpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'parity-test', version: '1.0.0' },
    });
    expect(manifest.version).toBe(init.result.serverInfo.version);

    const expectedTools = WEBMCP_TOOLS.map(({ name, description, annotations, inputSchema, outputSchema }) => ({
      name,
      description,
      annotations,
      inputSchema,
      outputSchema,
    }));
    expect(manifest.tools).toEqual(expectedTools);
  });

  it('includes lastChecked on decision tools and limitations on recommend', () => {
    const manifest = readJson('public/.well-known/webmcp.json');
    const tools = new Map((manifest.tools as JsonObject[]).map((t) => [String(t.name), t]));
    const compare = tools.get('compare_agents') as JsonObject;
    const compareAgentProps = ((((compare.outputSchema as JsonObject).properties as JsonObject).agents as JsonObject).items as JsonObject).properties as JsonObject;
    expect(compareAgentProps).toHaveProperty('lastChecked');

    const recommend = tools.get('recommend') as JsonObject;
    const recItemProps = ((((recommend.outputSchema as JsonObject).properties as JsonObject).recommendations as JsonObject).items as JsonObject).properties as JsonObject;
    expect(recItemProps).toHaveProperty('limitations');
    expect(((recItemProps.pick as JsonObject).properties as JsonObject)).toHaveProperty('lastChecked');
  });
});

describe('MCP manifest parity (public/.well-known/mcp.json & server.json <-> live /api/mcp)', () => {
  it('matches live initialize version and tools/list declarations (including outputSchema & annotations)', async () => {
    const manifest = readJson('public/.well-known/mcp.json');
    const serverJson = readJson('server.json');

    const init = await mcpRpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'parity-test', version: '1.0.0' },
    });
    expect(manifest.version).toBe(init.result.serverInfo.version);
    expect(serverJson.version).toBe(init.result.serverInfo.version);

    const listed = await mcpRpc('tools/list');
    const liveTools = (listed.result.tools as JsonObject[]).map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      annotations: t.annotations,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema,
    }));
    expect(manifest.tools).toEqual(liveTools);
  });

  it('exposes lastChecked, updatedAt, and limitations in MCP get_agent output and schema', async () => {
    const { result } = await mcpRpc('tools/call', { name: 'get_agent', arguments: { slug: 'playwright-mcp' } });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as JsonObject;
    expect(typeof data.updatedAt).toBe('string');
    expect(data.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(data.limitations)).toBe(true);
    expect(data).not.toHaveProperty('featured');
    expect(data).not.toHaveProperty('sponsored');
  });
});

describe('OpenAPI parity (public/openapi.json <-> runtime REST route outputs)', () => {
  const openapi = readJson('public/openapi.json');
  const schemas = ((openapi.components as JsonObject).schemas ?? {}) as JsonObject;
  const responses = ((openapi.components as JsonObject).responses ?? {}) as JsonObject;
  const paths = (openapi.paths ?? {}) as JsonObject;

  it('DecisionAgent and TaskAgent schemas carry no featured or sponsored properties', () => {
    const decision = resolveSchema(openapi, schemas.DecisionAgent);
    const decisionProps = decision.properties as JsonObject;
    expect(decisionProps).not.toHaveProperty('featured');
    expect(decisionProps).not.toHaveProperty('sponsored');
    expect(decisionProps).toHaveProperty('authType');
    expect(decisionProps).toHaveProperty('lastChecked');

    const taskAgent = resolveSchema(openapi, schemas.TaskAgent);
    const taskAgentProps = taskAgent.properties as JsonObject;
    expect(taskAgentProps).not.toHaveProperty('featured');
    expect(taskAgentProps).not.toHaveProperty('sponsored');
    expect(taskAgentProps).toHaveProperty('authType');
    expect(taskAgentProps).toHaveProperty('why');
  });

  it('documents the 110 req/min rate limit and 429 response on /api/recommend and all REST GET routes', () => {
    const rateLimited = responses.RateLimited as JsonObject;
    expect(String(rateLimited.description)).toContain(`${REST_REQUESTS_PER_MINUTE} requests`);
    expect(JSON.stringify(rateLimited)).toContain(`${REST_REQUESTS_PER_MINUTE} requests per minute`);
    expect(String((openapi.info as JsonObject).description)).toContain(`${REST_REQUESTS_PER_MINUTE} requests`);

    for (const routePath of [
      '/api/agents',
      '/api/agents/{slug}',
      '/api/agents/{slug}/alternatives',
      '/api/categories',
      '/api/stacks',
      '/api/stacks/{slug}',
      '/api/tasks',
      '/api/tasks/{slug}',
      '/api/compare',
      '/api/bundle',
      '/api/recommend',
    ]) {
      const op = (paths[routePath] as JsonObject).get as JsonObject;
      expect((op.responses as JsonObject)['429'], `${routePath} 429`).toEqual({ $ref: '#/components/responses/RateLimited' });
    }
  });

  const req = (url: string, ip: string) => new Request(url, { headers: { 'x-forwarded-for': ip } });

  it('validates live REST route outputs against their declared OpenAPI schemas', async () => {
    const checks: [string, string, () => Promise<Response>][] = [
      ['/api/agents', 'SearchResult', () => agentsRoute(req('http://localhost/api/agents?limit=5', '198.51.102.1'))],
      [
        '/api/agents/{slug}',
        'AgentDetail',
        () => agentRoute(req('http://localhost/api/agents/playwright-mcp', '198.51.102.2'), { params: Promise.resolve({ slug: 'playwright-mcp' }) }),
      ],
      ['/api/categories', 'CategoryList', () => categoriesRoute(req('http://localhost/api/categories', '198.51.102.3'))],
      ['/api/tasks', 'TaskList', () => tasksRoute(req('http://localhost/api/tasks', '198.51.102.4'))],
      [
        '/api/tasks/{slug}',
        'TaskDetail',
        () =>
          taskRoute(req('http://localhost/api/tasks/send-and-read-email', '198.51.102.5'), {
            params: Promise.resolve({ slug: 'send-and-read-email' }),
          }),
      ],
      ['/api/stacks', 'StackList', () => stacksRoute(req('http://localhost/api/stacks', '198.51.102.6'))],
      [
        '/api/stacks/{slug}',
        'Stack',
        () =>
          stackRoute(req('http://localhost/api/stacks/research-analyst', '198.51.102.7'), {
            params: Promise.resolve({ slug: 'research-analyst' }),
          }),
      ],
      [
        '/api/compare',
        'CompareResult',
        () => compareRoute(req('http://localhost/api/compare?a=deepgram&b=assemblyai', '198.51.102.8')),
      ],
      [
        '/api/agents/{slug}/alternatives',
        'AlternativesResult',
        () =>
          alternativesRoute(req('http://localhost/api/agents/deepgram/alternatives?limit=3', '198.51.102.9'), {
            params: Promise.resolve({ slug: 'deepgram' }),
          }),
      ],
      [
        '/api/bundle',
        'BundleResult',
        () => bundleRoute(req('http://localhost/api/bundle?items=linear,sentry-mcp,playwright-mcp', '198.51.102.10')),
      ],
      [
        '/api/recommend',
        'RecommendResult',
        () => recommendRoute(req('http://localhost/api/recommend?need=query+Postgres+and+send+email', '198.51.102.11')),
      ],
    ];

    for (const [label, schemaName, call] of checks) {
      const res = await call();
      expect(res.status, label).toBe(200);
      const body = await res.json();
      const errors = validateAgainstOpenApi(openapi, schemas[schemaName], body, label);
      expect(errors, `${label} vs ${schemaName}`).toEqual([]);

      if (['/api/tasks/{slug}', '/api/compare', '/api/agents/{slug}/alternatives', '/api/bundle', '/api/recommend'].includes(label)) {
        expect(JSON.stringify(body), `${label} must be organic`).not.toMatch(
          /"(featured|featuredUntil|sponsored|sponsoredUntil|sponsorLabel|tier)"/
        );
      }
    }
  });
});
