import Link from '@/components/Link';
import { Fragment } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { AgentIcon } from '@/components/AgentIcon';
import { ConnectStack, ConnectStackRows } from '@/components/ConnectStack';
import { CopyButton } from '@/components/CopyButton';
import { OperatorBox, OperatorEvents } from '@/components/OperatorBox';
import { SaveStack } from '@/components/SaveStack';
import { connectBundle } from '@/lib/bundle';
import { getOrganicAgents } from '@/lib/catalog';
import { compareHref } from '@/lib/compare-link';
import { smallIconPath } from '@/lib/icons';
import { pageMetadata } from '@/lib/metadata';
import { OPERATOR_ALTERNATIVES, pickedBecause, putThrough, type OperatorPart } from '@/lib/operator';
import { cleanRequest, OPERATOR_EXAMPLES, operatorHref, PARTS_MAX, REQUEST_MAX, rephrased } from '@/lib/request-parts';
import { ACCESS_METHOD_LABELS, browseHref } from '@/lib/search';
import { operatorCard, operatorCardImage } from '@/lib/share-cards';
import { cleanStackTitle } from '@/lib/stack-link';
import { getTasks, taskTitle } from '@/lib/tasks';
import type { Agent } from '@/lib/types';
import { joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
const HONEST = "Assembled from the directory's task map — no AI guesses.";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function load(searchParams: Props['searchParams']) {
  const [query, catalog] = await Promise.all([searchParams, getOrganicAgents()]);
  const tasks = getTasks();
  const raw = [query.q].flat()[0];
  const asked = cleanRequest(raw).text;
  return { tasks, catalog, asked, operator: asked ? putThrough(raw, tasks, catalog) : null };
}

export async function generateMetadata({ searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { tasks, catalog, asked, operator } = await load(searchParams);
  // Anyone can make one of these links, so search engines skip them all.
  const robots = asked ? { robots: { index: false, follow: true } } : {};
  if (operator && operator.stack.length > 0) {
    const card = operatorCard(operator, false);
    const jobs = [...new Set(operator.parts.flatMap((p) => (p.pick && p.task ? [p.task.label] : [])))];
    return pageMetadata(
      {
        title: `${joinList(card.names)}: a stack from the Operator`,
        description: `${card.names.length} ${pluralize(card.names.length, 'tool')} for ${card.jobs} ${pluralize(card.jobs, 'job')}, put through by the Operator from the directory's task map: ${joinList(jobs.map((job) => `“${job}”`))}.`,
        path: operatorHref(asked),
        image: operatorCardImage(asked, card),
        ...robots,
      },
      parent
    );
  }
  return pageMetadata(
    {
      title: 'The Operator: ask the switchboard',
      description: `Say the whole job in your own words, like “${OPERATOR_EXAMPLES[0]}”, and the Operator puts each part through to a tool from the directory, with one config to connect them all. No AI guesses: it reads the directory's task map.`,
      path: asked ? operatorHref(asked) : '/operator',
      image: operatorCardImage(null, operatorCard(putThrough(OPERATOR_EXAMPLES[0], tasks, catalog), true)),
      ...robots,
    },
    parent
  );
}

const inlineLink = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';
const NUMBER =
  'inline-flex h-8 min-w-8 shrink-0 items-center justify-center bg-[var(--dir-yellow)] px-1.5 text-[17px] font-extrabold text-[var(--dir-on-yellow)]';

function names(agents: Agent[]) {
  return agents.map((agent, i) => (
    <Fragment key={agent.slug}>
      {i > 0 && (i === agents.length - 1 ? ' and ' : ', ')}
      <Link href={`/agents/${agent.slug}`} className={inlineLink}>
        {agent.name}
      </Link>
    </Fragment>
  ));
}

/** One part as put through; `earlier` is the number of an earlier part with the same pick, else 0. */
function PartResult({ part, n, request, earlier, taskCount }: { part: OperatorPart; n: number; request: string; earlier: number; taskCount: number }) {
  const { task, pick, alternatives } = part;
  const compared = pick ? [pick, ...alternatives].map((a) => a.slug) : [];
  return (
    <li className="border-b-2 border-[var(--dir-ink)]! py-5 last:border-b-0">
      <p className="flex items-baseline gap-3 text-[19px] font-extrabold leading-snug">
        <span className={NUMBER}>{n}</span>
        <span className="min-w-0 wrap-break-word">&ldquo;{part.text}&rdquo;</span>
      </p>
      <div className="mt-1.5 sm:pl-11">
        {task ? (
          <p className="text-[16px]">
            <span aria-hidden="true">→ </span>
            <Link href={`/tasks/${task.slug}`} className={inlineLink}>
              {taskTitle(task)}
            </Link>
            <span className="text-[var(--dir-muted)]">
              {' '}
              · {part.fits} {pluralize(part.fits, 'tool')}
            </span>
          </p>
        ) : (
          <p className="text-[16px]">
            No task in the directory&apos;s map names it.{' '}
            {part.nearest.length > 0 ? (
              <>
                Did you mean{' '}
                {part.nearest.map((t, i) => {
                  const instead = rephrased(request, part.text, t.label);
                  return (
                    <Fragment key={t.slug}>
                      {i > 0 && (i === part.nearest.length - 1 ? ' or ' : ', ')}
                      &ldquo;
                      <Link href={instead ? operatorHref(instead) : `/tasks/${t.slug}`} data-fallback-task={t.slug} className={inlineLink}>
                        {t.label}
                      </Link>
                      &rdquo;
                    </Fragment>
                  );
                })}
                ?
              </>
            ) : (
              <>
                Try other words, see{' '}
                <Link href="/tasks" className={inlineLink}>
                  all {taskCount} tasks
                </Link>
                , or{' '}
                <Link href={browseHref(part.text)} className={inlineLink}>
                  search the directory for it
                </Link>
                .
              </>
            )}
          </p>
        )}

        {task && !pick && (
          <p className="mt-2 text-[16px]">
            No listing in the directory does this yet.{' '}
            <Link href="/submit" className={inlineLink}>
              Suggest one
            </Link>
            .
          </p>
        )}

        {pick &&
          (earlier > 0 ? (
            <p className="mt-2 text-[16px]">
              The same tool as for part {earlier}:{' '}
              <Link href={`/agents/${pick.slug}`} className={inlineLink}>
                {pick.name}
              </Link>
              .
            </p>
          ) : (
            <div className="mt-1">
              <AgentCard agent={pick} why={part.why ?? undefined} />
            </div>
          ))}

        {pick && <p className="mt-2 text-[15px] text-[var(--dir-muted)]">{pickedBecause(part)}</p>}

        {part.unmet.length > 0 && (
          <ul className="mt-2 space-y-1 border-l-4 border-[var(--dir-yellow)]! pl-3 text-[15px] font-semibold">
            {part.unmet.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {alternatives.length > 0 && (
          <p className="mt-2 text-[15px]">
            Also fits: {names(alternatives)}.{' '}
            <Link href={compareHref(compared)} className={inlineLink}>
              {compared.length === 2 ? 'Compare both' : `Compare all ${compared.length}`}
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        )}
      </div>
    </li>
  );
}

const HOW = [
  <>
    Commas, full stops, new lines, &ldquo;then&rdquo; and &ldquo;and&rdquo; split the request into parts, up to {PARTS_MAX}.
  </>,
  <>
    Each part goes to the task it names, by the keywords of the{' '}
    <Link href="/tasks" className={inlineLink}>
      directory&apos;s tasks
    </Link>
    . A part that names none is offered the nearest.
  </>,
  <>
    Among the task&apos;s tools, best fit first, those that mention what the part names come first: a product (&ldquo;Linear&rdquo;,
    &ldquo;Postgres&rdquo;) or a thing (&ldquo;pull requests&rdquo;). Ask for an MCP, a CLI, an API or Official, and the pick has it when one
    of them does.
  </>,
  <>
    Each part&apos;s pick goes in the stack, with {OPERATOR_ALTERNATIVES} more that fit to compare, and one config to connect them all. The
    same request always gets the same stack.
  </>,
];

export default async function OperatorPage({ searchParams }: Props) {
  const { tasks, catalog, asked, operator } = await load(searchParams);
  const terms = tasks.map(({ slug, label, keywords }) => ({ slug, label, keywords }));
  const parts = operator?.parts ?? [];
  const stack = operator?.stack ?? [];
  const picked = parts.filter((p) => p.pick).length;
  const examples =
    stack.length === 0 ? OPERATOR_EXAMPLES.map((request) => ({ request, stack: putThrough(request, tasks, catalog).stack })) : [];
  const path = asked ? operatorHref(asked) : '/operator';
  const url = `${BASE_URL}${path}`;
  const bundle = stack.length > 0 ? connectBundle(stack) : null;
  const items = stack.map((a) => ({ slug: a.slug, name: a.name, icon: a.iconUrl ? smallIconPath(a.iconUrl) : null }));
  const tools = `${stack.length} ${pluralize(stack.length, 'tool')}`;
  const notes = [
    ...(operator?.cut ? [`Only the first ${REQUEST_MAX} characters were read.`] : []),
    ...(operator && operator.extra > 0
      ? [`${operator.extra} more ${pluralize(operator.extra, 'part')} left out: it puts through up to ${PARTS_MAX}.`]
      : []),
  ];
  const firstFor = new Map<string, number>();
  const earlier = parts.map((part, i) => {
    if (!part.pick) return 0;
    const first = firstFor.get(part.pick.slug);
    if (first) return first;
    firstFor.set(part.pick.slug, i + 1);
    return 0;
  });
  const count = picked > 0 && picked < parts.length ? `${picked} of ${parts.length}` : `${parts.length}`;

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mx-auto max-w-3xl">
          <header className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
              {asked ? (
                <Link href="/operator" className="text-[var(--dir-ink)] no-underline hover:underline">
                  The Operator
                </Link>
              ) : (
                'The Operator'
              )}
            </p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">Ask the switchboard</h1>
            {!asked && (
              <p className="mb-3 text-lg text-[var(--dir-muted)]">
                Say the whole job in your own words. The operator puts each part through to a tool from the directory, with{' '}
                {OPERATOR_ALTERNATIVES} more that fit, and one config to connect them all.
              </p>
            )}
            <p className="text-[15px] font-bold tracking-[0.02em]">{HONEST}</p>
          </header>

          <OperatorBox key={asked} tasks={terms} label="Your request" initial={asked} from="operator" />

          <OperatorEvents from="operator">
            {operator && parts.length === 0 && (
              <p className="mt-6 border-l-4 border-[var(--dir-yellow)]! pl-3 text-[16px] font-semibold">
                Nothing in it says what to do yet. Name a job: &ldquo;query Postgres&rdquo;, &ldquo;ping me on Slack&rdquo;.
              </p>
            )}

            {parts.length > 0 && (
              <section aria-labelledby="put-through" className="mt-8">
                <h2 id="put-through" className="dir-bar">
                  {picked > 0 ? 'Put through' : 'Not put through'}{' '}
                  <span className="dir-bar-count">
                    · {count} {pluralize(parts.length, 'part')}
                  </span>
                </h2>
                {notes.length > 0 && (
                  <ul className="mt-4 space-y-1 border-l-4 border-[var(--dir-yellow)]! pl-3 text-[16px] font-semibold">
                    {notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
                <ol>
                  {parts.map((part, i) => (
                    <PartResult key={i} part={part} n={i + 1} request={asked} earlier={earlier[i]} taskCount={tasks.length} />
                  ))}
                </ol>
              </section>
            )}

            {stack.length > 0 && (
              <section aria-labelledby="use-this-stack" className="mt-8">
                <h2 id="use-this-stack" className="dir-bar">
                  Use this stack <span className="dir-bar-count">· {tools}</span>
                </h2>
                <ul>
                  {stack.map((agent) => (
                    <li key={agent.slug}>
                      <Link href={`/agents/${agent.slug}`} className="dir-row">
                        <AgentIcon name={agent.name} iconUrl={agent.iconUrl} className="self-center" />
                        <span className="dir-row-name">{agent.name}</span>
                        <span className="dir-row-leader" aria-hidden="true" />
                        <span className="dir-row-meta">{agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <SaveStack items={items} title={cleanStackTitle(asked)} from="operator" />
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <code className="mono min-w-0 break-all text-[14px] font-bold">{url}</code>
                  <CopyButton text={url} what="the link to this request" event="stack_share" data={{ items: stack.length, from: 'operator' }} />
                </div>
              </section>
            )}

            {examples.length > 0 && (
              <section aria-labelledby="try-one" className="mt-8">
                <h2 id="try-one" className="dir-bar">
                  Try one
                </h2>
                <ul>
                  {examples.map(({ request }, i) => (
                    <li key={request}>
                      <Link href={operatorHref(request)} data-example={i + 1} className="dir-row max-sm:items-end">
                        <span className="dir-row-name max-sm:whitespace-normal">&ldquo;{request}&rdquo;</span>
                        <span className="dir-row-leader" aria-hidden="true" />
                        <span className="dir-row-meta" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </OperatorEvents>

          {bundle && <ConnectStack bundle={bundle} from="operator" />}

          {stack.length === 0 && (
            <section aria-labelledby="how-it-works" className="mt-10">
              <h2 id="how-it-works" className="dir-bar">
                How it puts a request through
              </h2>
              <ol className="mt-4 space-y-3">
                {HOW.map((step, i) => (
                  <li key={i} className="flex items-baseline gap-3 text-[17px] leading-snug">
                    <span className={NUMBER}>{i + 1}</span>
                    <p className="min-w-0">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <nav
            aria-label="More ways to find tools"
            className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
          >
            <Link href="/tasks" className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>All tasks
            </Link>
            <Link href="/stacks" className="text-[var(--dir-ink)] no-underline hover:underline">
              Curated stacks<span aria-hidden="true"> →</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide max-w-4xl py-10">
          <div className="mb-6">
            <div className="agent-accent mb-1 break-all text-base font-bold">{path}</div>
            <div className="agent-dim text-xs">
              {operator
                ? `${parts.length} ${pluralize(parts.length, 'part')} · ${picked} put through · ${tools} · the same request always gets the same stack`
                : `the operator: a request in plain words, a tool for each part · /operator?q=<request>, up to ${REQUEST_MAX} characters and ${PARTS_MAX} parts`}
            </div>
            <div className="agent-dim mt-1 text-xs">{HONEST}</div>
          </div>

          {operator && (
            <>
              <div className="agent-section-title">request</div>
              <div className="agent-row agent-row-stack">
                <span className="agent-accent">q</span>
                <span className="agent-dim wrap-anywhere">{operator.request}</span>
                <span className="agent-dim">{notes.join(' ')}</span>
              </div>
            </>
          )}

          {parts.length > 0 && (
            <>
              <div className="agent-section-title">parts · {parts.length}</div>
              {parts.map((part, i) =>
                part.pick && part.task ? (
                  <Link key={i} href={`/agents/${part.pick.slug}`} className="agent-row agent-row-stack no-underline hover:underline">
                    <span className="agent-accent">
                      {i + 1}. {part.pick.slug}
                    </span>
                    <span className="agent-dim">
                      /tasks/{part.task.slug} · {part.fits} fit
                    </span>
                    <span className="agent-dim">
                      &ldquo;{part.text}&rdquo; · {pickedBecause(part)}
                      {part.unmet.length > 0 && ` ${part.unmet.join(' ')}`}
                      {part.alternatives.length > 0 && ` · also: ${part.alternatives.map((a) => a.slug).join(', ')}`}
                    </span>
                  </Link>
                ) : (
                  <div key={i} className="agent-row agent-row-stack">
                    <span className="agent-accent">{i + 1}. —</span>
                    <span className="agent-dim">
                      {part.task
                        ? `/tasks/${part.task.slug} · 0 fit`
                        : part.nearest.length > 0
                          ? `no task · nearest: ${part.nearest.map((t) => t.slug).join(', ')}`
                          : 'no task'}
                    </span>
                    <span className="agent-dim">&ldquo;{part.text}&rdquo;</span>
                  </div>
                )
              )}
            </>
          )}

          {bundle && <ConnectStackRows bundle={bundle} />}

          {examples.length > 0 && (
            <>
              <div className="agent-section-title">try one</div>
              {examples.map(({ request, stack: picks }) => (
                <Link key={request} href={operatorHref(request)} className="agent-row agent-row-stack no-underline hover:underline">
                  <span className="agent-accent">{operatorHref(request)}</span>
                  <span className="agent-dim">{request}</span>
                  <span className="agent-dim">{picks.map((a) => a.slug).join('+')}</span>
                </Link>
              ))}
              <div className="agent-section-title">how it puts a request through</div>
              <div className="agent-row agent-row-stack">
                <span className="agent-accent">parts</span>
                <span className="agent-dim">split at , ; . and new lines, &ldquo;then&rdquo;, &ldquo;also&rdquo;, &ldquo;plus&rdquo;, and &ldquo;and&rdquo; when both sides name a task</span>
                <span className="agent-dim">up to {PARTS_MAX}</span>
              </div>
              <div className="agent-row agent-row-stack">
                <span className="agent-accent">task</span>
                <span className="agent-dim">the task each part names, by the keywords of /tasks</span>
                <span className="agent-dim">{tasks.length} tasks</span>
              </div>
              <div className="agent-row agent-row-stack">
                <span className="agent-accent">pick</span>
                <span className="agent-dim">the task&apos;s tools, best fit first; those that mention what the part names first, then an asked-for access method or &ldquo;official&rdquo;</span>
                <span className="agent-dim">+{OPERATOR_ALTERNATIVES} alternatives</span>
              </div>
              <div className="agent-row agent-row-stack">
                <span className="agent-accent">stack</span>
                <span className="agent-dim">each pick once, in order, with one connect bundle</span>
                <span className="agent-dim">GET /api/bundle?items=</span>
              </div>
            </>
          )}

          <div className="agent-section-title">more</div>
          <Link href="/tasks" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/tasks</span>
            <span className="agent-dim">every task, with its keywords</span>
            <span className="agent-dim">json: GET /api/tasks</span>
          </Link>
          <Link href="/stacks" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/stacks</span>
            <span className="agent-dim">curated stacks</span>
            <span className="agent-dim" />
          </Link>
          <Link href="/my-stack" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/my-stack</span>
            <span className="agent-dim">make and share your own</span>
            <span className="agent-dim" />
          </Link>
        </div>
      </div>
    </>
  );
}
