import { CopyButton } from '@/components/CopyButton';
import type { TryThis } from '@/lib/try-this';

export const PART_HEADING = 'text-[19px] font-extrabold leading-tight [font-family:var(--font-display)]';

/** A listing's "Try this first" prompts (lib/try-this.ts), each with its skill and a copy button. The first part of Use it now. */
export function TryThisFirst({ slug, tryThis }: { slug: string; tryThis: TryThis }) {
  return (
    <section aria-labelledby="try-this-first">
      <h3 id="try-this-first" className={PART_HEADING}>
        Try this first
      </h3>
      <p className="mt-2 font-semibold text-[var(--dir-muted)]">{tryThis.lead}</p>
      <ul>
        {tryThis.prompts.map((prompt) => (
          <li key={prompt.skillId} className="border-b border-[var(--dir-rule)]! py-3 last:border-b-0 last:pb-0">
            <div className="flex min-h-10 items-center justify-between gap-3">
              <span className="dir-label min-w-0 text-[var(--dir-muted)]">{prompt.skillName}</span>
              <CopyButton
                text={prompt.text}
                what={`the ${prompt.skillName} prompt`}
                event="try_prompt_copy"
                data={{ slug, skill: prompt.skillId }}
              />
            </div>
            <p className="mt-1 text-[17px] font-bold leading-snug">
              {prompt.task}: <span className="font-semibold text-[var(--dir-muted)]">‹{prompt.slot}›</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
