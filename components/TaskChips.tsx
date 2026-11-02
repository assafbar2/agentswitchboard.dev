import Link from 'next/link';
import { TaskEvents } from '@/components/TaskEvents';
import type { Task } from '@/lib/tasks';

/** Tasks a chip row shows: the first in content/tasks.json, which leads with the jobs asked for most. */
export const TASK_CHIPS = 8;

const CHIP =
  'inline-flex min-h-11 items-center whitespace-nowrap border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 text-[16px] font-semibold leading-tight text-[var(--dir-ink)] no-underline hover:bg-[var(--dir-rule)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';

// -mx-6 and px-6 match .container-wide's padding, so the row runs to the screen's edges; py-1 keeps focus outlines inside the scroll box.
const ONE_ROW_ON_PHONES = 'max-sm:-mx-6 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-6 max-sm:py-1';

/** The first TASK_CHIPS tasks as links to their listings on /browse, then every task on /tasks. */
export function TaskChips({
  tasks,
  from,
  href = (task) => `/browse?task=${task.slug}`,
  oneRowOnPhones = false,
}: {
  tasks: Task[];
  /** Where the row is, for the `task_select` count. */
  from: string;
  href?: (task: Task) => string;
  /** On a phone, one row that scrolls sideways to the screen's edges, so what follows stays in view. */
  oneRowOnPhones?: boolean;
}) {
  return (
    <TaskEvents from={from}>
      <ul className={oneRowOnPhones ? `flex flex-wrap gap-2 ${ONE_ROW_ON_PHONES}` : 'flex flex-wrap gap-2'}>
        {tasks.slice(0, TASK_CHIPS).map((task) => (
          <li key={task.slug} className="shrink-0">
            <Link href={href(task)} className={CHIP}>
              {task.label}
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link
            href="/tasks"
            className="inline-flex min-h-11 items-center whitespace-nowrap px-1 text-[16px] font-bold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
          >
            All {tasks.length} tasks&nbsp;<span aria-hidden="true">→</span>
          </Link>
        </li>
      </ul>
    </TaskEvents>
  );
}
