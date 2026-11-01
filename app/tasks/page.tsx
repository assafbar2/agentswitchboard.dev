import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { TaskEvents } from '@/components/TaskEvents';
import { TaskRow } from '@/components/TaskRow';
import { getEveryAgent } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { taskMatches } from '@/lib/search';
import { tasksCard, tasksCardImage } from '@/lib/share-cards';
import { getTasks, taskTitle, type Task } from '@/lib/tasks';
import type { Agent } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

interface Row {
  task: Task;
  fits: Agent[];
}

async function rows(): Promise<Row[]> {
  const catalog = await getEveryAgent();
  return getTasks().map((task) => ({ task, fits: taskMatches(catalog, task) }));
}

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const all = await rows();
  return pageMetadata(
    {
      title: 'Tasks',
      description: `Start from the job: ${all.length} tasks, each with the AI agents, MCP servers and tools in the directory that do it, best fit first, and why each one fits.`,
      path: '/tasks',
      image: tasksCardImage(tasksCard(all)),
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function TasksPage() {
  const all = await rows();

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tasks',
    url: `${BASE_URL}/tasks`,
    numberOfItems: all.length,
    itemListElement: all.map(({ task }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: taskTitle(task),
      url: `${BASE_URL}/tasks/${task.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-6">
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">Tasks</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              Start from what you need done. Each task lists the agents, MCP servers and tools in the directory that do
              it, best fit first, with why each one fits. Know the tool&apos;s name already?{' '}
              <Link href="/browse" className={inlineLink}>
                Search the directory
              </Link>
              .
            </p>
          </div>

          <section aria-labelledby="i-need-to">
            <h2 id="i-need-to" className="dir-bar">
              I need to… <span className="dir-bar-count">· {all.length}</span>
            </h2>
            <TaskEvents from="tasks">
              <ul>
                {all.map((row) => (
                  <TaskRow key={row.task.slug} {...row} />
                ))}
              </ul>
            </TaskEvents>
          </section>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/tasks</div>
            <div className="agent-dim text-xs">
              {all.length} tasks · each lists the listings that fit it, best first · as JSON: GET /api/tasks
            </div>
          </div>

          <div className="agent-section-title">i need to…</div>
          {all.map(({ task, fits }) => (
            <Link key={task.slug} href={`/tasks/${task.slug}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/tasks/{task.slug}</span>
              <span className="agent-dim">{fits.length} fit</span>
              <span className="agent-dim">{task.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
