import Link from 'next/link';
import { AgentIcon } from '@/components/AgentIcon';
import type { Task } from '@/lib/tasks';
import type { Agent } from '@/lib/types';
import { pluralize } from '@/lib/utils';

const ICONS = 6;

/** The task, dotted leader and how many listings fit; its best fits' icons; the blurb. */
export function TaskRow({ task, fits }: { task: Task; fits: Agent[] }) {
  const icons = fits.filter((a, i) => fits.findIndex((b) => b.iconUrl === a.iconUrl) === i).slice(0, ICONS);
  return (
    <li className="border-b border-[var(--dir-rule)]!">
      <Link href={`/tasks/${task.slug}`} className="group block py-3 text-[var(--dir-ink)] no-underline">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 wrap-break-word text-[19px] font-extrabold leading-snug group-hover:underline">
            {task.label}
          </span>
          <span
            aria-hidden="true"
            className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
          />
          <span className="shrink-0 whitespace-nowrap text-[15px] font-bold">
            {fits.length} {pluralize(fits.length, 'tool')}
          </span>
        </span>
        <span className="mt-1.5 flex gap-1">
          {icons.map((agent) => (
            <AgentIcon key={agent.slug} name={agent.name} iconUrl={agent.iconUrl} />
          ))}
        </span>
        <span className="mt-1 block text-[15px] leading-snug text-[var(--dir-muted)]">{task.blurb}</span>
      </Link>
    </li>
  );
}
