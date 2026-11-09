import { smallIconPath } from '@/lib/icons';
import { MY_STACK_MAX } from '@/lib/stack-link';
import type { Agent } from '@/lib/types';

/**
 * A listing page's My stack toggle, with a line on what it is for.
 * components/MyStackClient.tsx runs it; without JavaScript the whole block
 * stays hidden.
 */
export function MyStackToggle({ agent, className = '' }: { agent: Pick<Agent, 'slug' | 'name' | 'iconUrl'>; className?: string }) {
  return (
    <div className={`stk-needs-js ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          data-stk={agent.slug}
          data-stk-name={agent.name}
          data-stk-icon={agent.iconUrl ? smallIconPath(agent.iconUrl) : undefined}
          data-stk-from="listing"
          aria-label={`Add ${agent.name} to My stack`}
          className="stk-toggle stk-toggle-lg"
        >
          My stack
        </button>
        <p className="min-w-0 grow basis-64 text-[15px] text-[var(--dir-muted)]">
          {`Keep it with up to ${MY_STACK_MAX - 1} other tools you're setting up, then share them all as one link.`}
        </p>
      </div>
    </div>
  );
}
