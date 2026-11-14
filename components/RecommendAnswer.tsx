import Link from '@/components/Link';
import { AgentIcon } from '@/components/AgentIcon';
import { CopyBlock } from '@/components/CopyBlock';
import { VerifiedNote } from '@/components/VerifiedNote';
import type { RecommendBody } from '@/lib/decide';
import { joinList, pluralize } from '@/lib/utils';

type Recommendation = RecommendBody['recommendations'][number];
type Listed = Recommendation['pick'];

const INLINE_LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';
const OFFICIAL_TAG =
  'official-tag inline-flex items-center gap-1 border border-[var(--dir-ink)]! px-1.5 py-px text-[11px] font-bold uppercase leading-4 tracking-[0.08em]';

/** A site URL from the API (https://agentswitchboard.dev/stack?items=…) as a path, so it opens on this deployment. */
function sitePath(url: string): string {
  try {
    const { pathname, search, hash } = new URL(url);
    return `${pathname}${search}${hash}`;
  } catch {
    return url;
  }
}

function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function Pick({ pick }: { pick: Listed }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Link
        href={`/agents/${pick.slug}`}
        className="flex min-w-0 items-center gap-2 text-[24px] font-extrabold leading-tight text-[var(--dir-ink)] no-underline hover:underline sm:text-[28px]"
      >
        <AgentIcon name={pick.name} iconUrl={pick.iconUrl ? sitePath(pick.iconUrl) : undefined} size={32} lazy={false} />
        <span className="min-w-0 wrap-break-word">{pick.name}</span>
      </Link>
      <span className="text-[15px] text-[var(--dir-muted)]">by {pick.provider}</span>
      {pick.official && <span className={OFFICIAL_TAG}>Official</span>}
      {pick.verified && <VerifiedNote checked={pick.lastChecked} />}
    </div>
  );
}

function Alternatives({ alternatives }: { alternatives: Listed[] }) {
  if (alternatives.length === 0) return null;
  return (
    <p className="text-[15px] text-[var(--dir-muted)]">
      <span className="dir-label mr-1.5 text-[13px] text-[var(--dir-ink)]">
        {alternatives.length === 1 ? 'Alternative' : 'Alternatives'}
      </span>
      {alternatives.map((alt, i) => (
        <span key={alt.slug}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          <Link href={`/agents/${alt.slug}`} className={INLINE_LINK}>
            {alt.name}
          </Link>
        </span>
      ))}
    </p>
  );
}

function OneRecommendation({ r, from }: { r: Recommendation; from: string }) {
  const config = r.nextStep.server
    ? JSON.stringify({ mcpServers: { [r.pick.slug]: r.nextStep.server } }, null, 2)
    : null;
  return (
    <article
      data-recommendation={r.pick.slug}
      className="flex min-w-0 flex-col gap-3 border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-4 py-4 sm:px-5"
    >
      <p className="text-[15px] text-[var(--dir-muted)]">
        For &ldquo;<span className="font-semibold text-[var(--dir-ink)]">{r.need}</span>&rdquo; ·{' '}
        <Link href={`/tasks/${r.task.slug}`} className={INLINE_LINK}>
          {r.task.label}
        </Link>
        , {r.fits} {pluralize(r.fits, 'tool')} do it
      </p>

      <Pick pick={r.pick} />

      <p className="text-[16px] leading-snug">
        <span className="dir-label mr-1.5 text-[13px]">Why</span>
        {r.pickedBecause.startsWith('Picked') ? r.pickedBecause : 'The task’s best fit.'}
        {r.why && ` ${sentence(r.why)}`}
      </p>

      <div>
        <p className="text-[16px] leading-snug">
          <span className="dir-label mr-1.5 text-[13px]">Next step</span>
          <a href={r.nextStep.url} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
            {r.nextStep.label}
          </a>
          <span className="text-[var(--dir-muted)]"> · {r.nextStep.note}</span>
        </p>
        {config && (
          <CopyBlock
            label="MCP client config"
            text={config}
            what={`the ${r.pick.name} config`}
            event="recommend_config_copy"
            data={{ from, agent: r.pick.slug }}
          />
        )}
      </div>

      <p data-limitations="" className="text-[15px] leading-snug">
        <span className="dir-label mr-1.5 text-[13px]">Limitations</span>
        {r.limitations.length > 0
          ? sentence(r.limitations.join('; ').replace(/^./, (c) => c.toUpperCase()))
          : 'None in its listing: no sign-in, a hosted server with a config to copy, and Verified.'}
      </p>

      <Alternatives alternatives={r.alternatives} />
    </article>
  );
}

/**
 * The recommend answer (lib/decide.ts recommendDecision), as GET /api/recommend
 * returns it: for each need, the pick, why, the next step with its config to
 * copy, its limitations and two alternatives. Organic only: the body carries
 * no placement field and nothing here labels one.
 */
export function RecommendAnswer({ body, from }: { body: RecommendBody; from: string }) {
  const nearest = body.unmatched.flatMap((u) => u.nearestTasks);
  return (
    <div className="flex flex-col gap-3">
      <div className={body.recommendations.length > 1 ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
        {body.recommendations.map((r, i) => (
          <OneRecommendation key={`${r.pick.slug}-${i}`} r={r} from={from} />
        ))}
      </div>
      {body.unmatched.length > 0 && (
        <p className="text-[15px] text-[var(--dir-muted)]">
          No pick for {joinList(body.unmatched.map((u) => `“${u.need}”`))}: no task in the directory matches it.
          {nearest.length > 0 && (
            <>
              {' '}
              Closest:{' '}
              {nearest.slice(0, 3).map((t, i) => (
                <span key={t.slug}>
                  {i > 0 && ', '}
                  <Link href={`/tasks/${t.slug}`} className={INLINE_LINK}>
                    {t.label}
                  </Link>
                </span>
              ))}
              .
            </>
          )}
        </p>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-[var(--dir-muted)]">
        <span>Picked by fixed matching rules, not a model. Paid placement never changes it.</span>
        {body.stackUrl && (
          <Link href={sitePath(body.stackUrl)} className={INLINE_LINK}>
            Connect all {body.recommendations.length} as one stack →
          </Link>
        )}
        <Link href={sitePath(body.operatorUrl)} className={INLINE_LINK}>
          Open it in the Operator →
        </Link>
      </p>
    </div>
  );
}
