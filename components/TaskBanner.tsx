import Link from 'next/link';
import { X } from 'lucide-react';
import { FILTER_BASE, FILTER_OFF } from '@/components/filter-chip';
import { taskTitle, type Task } from '@/lib/tasks';

/**
 * The task a /browse view is narrowed to: the job, how its listings are
 * picked, a link to its page, and one click back to the view without it.
 */
export function TaskBanner({ task, explanation, removeHref }: { task: Task; explanation: string; removeHref: string }) {
  return (
    <section aria-label="Task" data-task={task.slug} className="mb-6 border-[3px] border-[var(--dir-ink)]! px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="dir-label text-[13px] text-[var(--dir-muted)]">Task</p>
          <p className="text-2xl font-extrabold leading-tight wrap-break-word">{taskTitle(task)}</p>
        </div>
        <Link href={removeHref} data-remove-task className={`${FILTER_BASE} ${FILTER_OFF} no-underline`}>
          <X className="w-3.5 h-3.5" aria-hidden />
          Remove task
        </Link>
      </div>
      <p className="mt-1 text-[16px] leading-snug">{task.blurb}</p>
      <p className="mt-1.5 text-[14px] leading-snug text-[var(--dir-muted)]">
        {explanation}{' '}
        <Link href={`/tasks/${task.slug}`} className="font-bold whitespace-nowrap text-[var(--dir-ink)]">
          About this task →
        </Link>
      </p>
    </section>
  );
}
