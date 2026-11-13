import Link from '@/components/Link';
import { AgentIcon } from '@/components/AgentIcon';
import { CopyBlock } from '@/components/CopyBlock';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { connectBundle } from '@/lib/bundle';
import { compareHref } from '@/lib/compare-link';
import type { Task } from '@/lib/tasks';
import type { Agent } from '@/lib/types';
import { formatDay } from '@/lib/utils';

export const COMPARISON_SIZE = 6;
const BUNDLE_SIZE = 3;

const ACCESS: Record<string, string> = {
  api: 'API',
  mcp: 'MCP',
  cli: 'CLI',
  'browser-extension': 'Extension',
};
const SIGN_IN: Record<Agent['authType'], string> = {
  none: 'None',
  apiKey: 'API key',
  bearer: 'Token',
  oauth2: 'Sign in (OAuth)',
};

/** What a row is best for: the skill named in its why-it-fits line, without the description. */
function bestFor(why: string | null, agent: Agent): string {
  const skill = why?.split(':')[0]?.trim();
  if (skill && skill.length <= 48) return skill;
  return agent.tags[0] ?? agent.categories[0]?.name ?? '';
}

function pickIf(agent: Agent): string {
  if (agent.official && agent.mcpEndpoint) return "you want the vendor's own hosted server";
  if (agent.official) return "you want the vendor's own tool";
  if (agent.authType === 'none') return 'you want to try it with no sign-up';
  if (agent.mcpEndpoint) return 'you want a hosted MCP, nothing to install';
  if (agent.accessMethods.includes('cli')) return 'you work from a terminal';
  return 'you are building on its API';
}

export function TaskComparison({
  task,
  rows,
  comparedOn,
}: {
  task: Task;
  rows: { agent: Agent; why: string | null }[];
  comparedOn: string;
}) {
  const top = rows.slice(0, COMPARISON_SIZE);
  const bundle = connectBundle(top.slice(0, BUNDLE_SIZE).map((r) => r.agent));
  const bundleNames = top.slice(0, BUNDLE_SIZE).map((r) => r.agent.slug);

  return (
    <section aria-labelledby="comparison" className="mb-10">
      <h2 id="comparison" className="dir-bar">
        Compared <span className="dir-bar-count">· top {top.length}</span>
      </h2>
      <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
        Checked against each listing on <strong className="text-[var(--dir-ink)]">{formatDay(comparedOn)}</strong>.
        Verified means its URLs load and its access answers; we recheck every month.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[15px]">
          <thead>
            <tr className="border-b-2 border-[var(--dir-ink)]! text-[13px] uppercase tracking-[0.08em]">
              <th className="py-2 pr-3 font-bold">Tool</th>
              <th className="py-2 pr-3 font-bold">Access</th>
              <th className="py-2 pr-3 font-bold">Sign-in</th>
              <th className="py-2 pr-3 font-bold">Maker</th>
              <th className="py-2 pr-3 font-bold">Checked</th>
              <th className="py-2 font-bold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {top.map(({ agent, why }) => (
              <tr key={agent.id} className="border-b border-[var(--dir-rule)]! align-top">
                <td className="py-2.5 pr-3">
                  <Link
                    href={`/agents/${agent.slug}`}
                    className="flex items-center gap-2 font-extrabold text-[var(--dir-ink)] no-underline hover:underline"
                  >
                    <AgentIcon name={agent.name} iconUrl={agent.iconUrl} />
                    {agent.name}
                  </Link>
                  <span className="mt-0.5 block text-[14px] leading-snug text-[var(--dir-muted)]">
                    {bestFor(why, agent)}. Pick it if {pickIf(agent)}.
                  </span>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap font-semibold">
                  {agent.accessMethods.map((m) => ACCESS[m] ?? m).join(' · ')}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{SIGN_IN[agent.authType]}</td>
                <td className="py-2.5 pr-3">
                  <span className="block">{agent.officialVendor?.name ?? agent.providerName}</span>
                  {agent.official && <span className="block text-[13px] font-bold">Official</span>}
                </td>
                <td className="py-2.5 pr-3">{agent.verified ? <VerifiedBadge /> : '–'}</td>
                <td className="py-2.5 whitespace-nowrap text-[14px] text-[var(--dir-muted)]">
                  {agent.updatedAt ? formatDay(agent.updatedAt) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[15px] font-bold">
        <Link href={compareHref(bundleNames)} className="text-[var(--dir-ink)] underline underline-offset-2">
          Compare the top {BUNDLE_SIZE} side by side →
        </Link>
      </div>

      {bundle.config && (
        <CopyBlock
          label={`Connect the top ${BUNDLE_SIZE} (MCP client config)`}
          text={JSON.stringify(bundle.config, null, 2)}
          what="config"
          event="task_bundle_copy"
          data={{ task: task.slug }}
        />
      )}
    </section>
  );
}
