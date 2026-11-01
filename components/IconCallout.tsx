import Link from 'next/link';
import { AgentIcon } from '@/components/AgentIcon';
import type { Agent } from '@/lib/types';

/**
 * A boxed link: listing icons, a bold title, a line of detail and a "See the
 * … →" cue. On phones the icons go above the text and the cue is hidden:
 * beside both, the text would be a column a few words wide.
 */
export function IconCallout({
  href,
  agents,
  title,
  detail,
  cue,
  className = '',
}: {
  href: string;
  agents: Pick<Agent, 'slug' | 'name' | 'iconUrl'>[];
  title: string;
  detail: string;
  cue: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 border border-[var(--dir-ink)]! px-4 py-3 text-[var(--dir-ink)] no-underline max-sm:flex-col max-sm:items-start max-sm:gap-2 ${className}`}
    >
      {agents.length > 0 && (
        <span className="flex shrink-0 gap-1">
          {agents.map((agent) => (
            <AgentIcon key={agent.slug} name={agent.name} iconUrl={agent.iconUrl} size={28} lazy={false} />
          ))}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-sm:flex-none sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
        <span className="text-[16px] font-extrabold group-hover:underline">{title}</span>
        <span className="text-[15px] text-[var(--dir-muted)]">{detail}</span>
      </span>
      <span className="text-[15px] font-bold whitespace-nowrap max-sm:hidden" aria-hidden="true">
        {cue} →
      </span>
    </Link>
  );
}
