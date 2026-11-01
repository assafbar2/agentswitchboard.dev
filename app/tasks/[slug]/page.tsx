import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { AgentIcon } from '@/components/AgentIcon';
import { EndpointLink } from '@/components/EndpointLink';
import { JsonLd } from '@/components/JsonLd';
import { TaskEvents } from '@/components/TaskEvents';
import { TaskRow } from '@/components/TaskRow';
import { getAllCategories, getEveryAgent } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { taskMatches } from '@/lib/search';
import { taskCard, taskCardImage } from '@/lib/share-cards';
import { getStacks, stacksInOrder } from '@/lib/stacks';
import {
  TASK_OFFICIAL_SIZE,
  TASK_PAGE_SIZE,
  getTask,
  getTasks,
  relatedStacks,
  relatedTasks,
  taskExplanation,
  taskTitle,
  whyItFits,
} from '@/lib/tasks';
import { joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const dynamicParams = false;

export function generateStaticParams() {
  return getTasks().map((t) => ({ slug: t.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function load(slug: string) {
  const task = getTask(slug);
  if (!task) return null;
  const catalog = await getEveryAgent();
  return { task, catalog, fits: taskMatches(catalog, task) };
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return { title: 'Task Not Found' };
  const { task, fits } = found;
  return pageMetadata(
    {
      title: taskTitle(task),
      description: `${task.blurb} ${fits.length} tools do it, including ${joinList(fits.slice(0, 3).map((a) => a.name))}.`,
      path: `/tasks/${task.slug}`,
      image: taskCardImage(task.slug, taskCard(task, fits)),
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function TaskPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { task, catalog, fits } = found;
  const categories = await getAllCategories();
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const best = fits.slice(0, TASK_PAGE_SIZE).map((agent) => ({ agent, why: whyItFits(agent, task) }));
  const official = fits.filter((a) => a.official);
  const tasks = getTasks();
  const related = relatedTasks(task, tasks, catalog).map((t) => ({ task: t, fits: taskMatches(catalog, t) }));
  const stacks = relatedStacks(fits, stacksInOrder(getStacks()));
  const next = tasks[(tasks.findIndex((t) => t.slug === task.slug) + 1) % tasks.length];
  const browse = `/browse?task=${task.slug}`;
  const tools = `${fits.length} ${pluralize(fits.length, 'tool')}`;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: taskTitle(task),
    description: task.blurb,
    url: `${BASE_URL}/tasks/${task.slug}`,
    numberOfItems: best.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: best.map(({ agent }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
              <Link href="/tasks" className="text-[var(--dir-ink)] no-underline hover:underline">
                Tasks
              </Link>
            </p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word sm:text-5xl">
              {taskTitle(task)}
            </h1>
            <p className="mb-3 text-lg text-[var(--dir-muted)]">{task.blurb}</p>
            <p className="text-[15px] font-bold tracking-[0.06em]">
              {tools}
              {official.length > 0 && ` · ${official.length} official`}
            </p>
            <p className="mt-1 text-[15px] text-[var(--dir-muted)]">{taskExplanation(task, categoryName)}</p>
          </div>

          <TaskEvents task={task.slug} from="task-page">
            <section aria-labelledby="best-fits">
              <h2 id="best-fits" className="dir-bar">
                Best fits <span className="dir-bar-count">· {best.length}</span>
              </h2>
              <ol>
                {best.map(({ agent, why }) => (
                  <li key={agent.id}>
                    <AgentCard agent={agent} why={why ?? undefined} />
                  </li>
                ))}
              </ol>
              <Link href={browse} className="dir-row mt-2">
                <span className="dir-row-name">
                  {fits.length > best.length ? `See all ${fits.length} on Browse, with filters` : 'Filter these on Browse'}
                </span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">
                  →
                </span>
              </Link>
            </section>

            {official.length > 0 && (
              <section aria-labelledby="official" className="mt-10">
                <h2 id="official" className="dir-bar">
                  Official <span className="dir-bar-count">· {official.length}</span>
                </h2>
                <p className="mt-2 mb-1 text-[15px] text-[var(--dir-muted)]">
                  The ones published by the company behind the product.
                </p>
                <ul>
                  {official.slice(0, TASK_OFFICIAL_SIZE).map((agent) => (
                    <li key={agent.id}>
                      <Link href={`/agents/${agent.slug}`} className="dir-row">
                        <AgentIcon name={agent.name} iconUrl={agent.iconUrl} className="self-center" />
                        <span className="dir-row-name">{agent.name}</span>
                        <span className="dir-row-leader" aria-hidden="true" />
                        <span className="dir-row-meta">{agent.officialVendor?.name ?? agent.providerName}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {official.length > TASK_OFFICIAL_SIZE && (
                  <Link href={`${browse}&official=1`} className="dir-row mt-2">
                    <span className="dir-row-name">See all {official.length} official on Browse</span>
                    <span className="dir-row-leader" aria-hidden="true" />
                    <span className="dir-row-meta" aria-hidden="true">
                      →
                    </span>
                  </Link>
                )}
              </section>
            )}

            {related.length > 0 && (
              <section aria-labelledby="related-tasks" className="mt-10">
                <h2 id="related-tasks" className="dir-bar">
                  Related tasks
                </h2>
                <ul>
                  {related.map((row) => (
                    <TaskRow key={row.task.slug} {...row} />
                  ))}
                </ul>
              </section>
            )}
          </TaskEvents>

          {stacks.length > 0 && (
            <section aria-labelledby="in-stacks" className="mt-10">
              <h2 id="in-stacks" className="dir-bar">
                In stacks
              </h2>
              <ul>
                {stacks.map(({ stack, shared }) => (
                  <li key={stack.slug} className="border-b border-[var(--dir-rule)]!">
                    <Link href={`/stacks/${stack.slug}`} className="group block py-3 text-[var(--dir-ink)] no-underline">
                      <span className="block text-[19px] font-extrabold leading-snug group-hover:underline">
                        {stack.title}
                      </span>
                      <span className="mt-0.5 block text-[15px] leading-snug text-[var(--dir-muted)]">
                        With {joinList(shared.map((a) => a.name))}, among {stack.items.length} tools that work together.
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <nav
            aria-label="More tasks"
            className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
          >
            <Link href="/tasks" className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>All tasks
            </Link>
            {next.slug !== task.slug && (
              <Link href={`/tasks/${next.slug}`} className="text-[var(--dir-ink)] no-underline hover:underline">
                Next: {next.label}
                <span aria-hidden="true"> →</span>
              </Link>
            )}
          </nav>
          <p className="mt-6 text-[15px] text-[var(--dir-muted)]">
            Missing a tool that does this?{' '}
            <Link href="/submit" className={inlineLink}>
              Suggest a listing
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/tasks/{task.slug}</div>
            <div className="agent-dim text-xs">
              {taskTitle(task)} · {fits.length} fit · {official.length} official · keywords: {task.keywords.join(', ')} ·
              categories: {task.categories.join(', ')} · access: {task.access.join('+')}
            </div>
            <div className="agent-dim text-xs mt-1">{task.blurb}</div>
          </div>

          <div className="agent-section-title">best fits</div>
          {best.map(({ agent, why }) => (
            <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">{agent.slug}</span>
              <span className="agent-dim">{agent.accessMethods.join('+')}</span>
              <span className="agent-dim">{why ?? agent.description}</span>
            </Link>
          ))}

          {official.length > 0 && (
            <>
              <div className="agent-section-title">official</div>
              <div className="agent-dim text-xs">{official.map((a) => a.slug).join(', ')}</div>
            </>
          )}

          {related.length > 0 && (
            <>
              <div className="agent-section-title">related tasks</div>
              {related.map(({ task: t, fits: f }) => (
                <Link key={t.slug} href={`/tasks/${t.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">/tasks/{t.slug}</span>
                  <span className="agent-dim">{f.length} fit</span>
                  <span className="agent-dim">{t.label}</span>
                </Link>
              ))}
            </>
          )}

          {stacks.length > 0 && (
            <>
              <div className="agent-section-title">in stacks</div>
              {stacks.map(({ stack, shared }) => (
                <Link key={stack.slug} href={`/stacks/${stack.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">/stacks/{stack.slug}</span>
                  <span className="agent-dim">{shared.map((a) => a.slug).join('+')}</span>
                  <span className="agent-dim">{stack.title}</span>
                </Link>
              ))}
            </>
          )}

          <div className="agent-section-title">more</div>
          <Link href={browse} className="agent-row no-underline hover:underline">
            <span className="agent-accent">{browse}</span>
            <span className="agent-dim">all {fits.length}, with filters</span>
            <span className="agent-dim" />
          </Link>
          <Link href="/tasks" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/tasks</span>
            <span className="agent-dim">every task</span>
            <span className="agent-dim" />
          </Link>
          <EndpointLink href={`/api/tasks/${task.slug}`} className="agent-row no-underline hover:underline">
            <span className="agent-accent">/api/tasks/{task.slug}</span>
            <span className="agent-dim">this task as JSON</span>
            <span className="agent-dim">GET · no auth</span>
          </EndpointLink>
        </div>
      </div>
    </>
  );
}
