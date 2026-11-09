import { IconCallout } from '@/components/IconCallout';
import type { Stack, StackEntry } from '@/lib/stacks';
import { joinList, pluralize } from '@/lib/utils';

/** As many icons as the latest-drop box above it on the homepage, so their text lines up. */
const ICONS = 3;

/** The stack of the week as a one-box link, on the homepage and on its drop page. */
export function StackCallout({ stack, entries, className }: { stack: Stack; entries: StackEntry[]; className?: string }) {
  return (
    <IconCallout
      href={`/stacks/${stack.slug}`}
      agents={entries.slice(0, ICONS).map((e) => e.agent)}
      title={`Stack of the week: ${stack.title}`}
      detail={`${entries.length} ${pluralize(entries.length, 'tool')}: ${joinList(entries.map((e) => e.agent.name))}`}
      cue="See the stack"
      className={className}
    />
  );
}
