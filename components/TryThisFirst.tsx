import { CopyButton } from '@/components/CopyButton';
import type { TryThis } from '@/lib/try-this';

/** A listing's "Try this first" prompts (lib/try-this.ts), each with its skill and a copy button. */
export function TryThisFirst({ slug, tryThis }: { slug: string; tryThis: TryThis }) {
  return (
    <section aria-labelledby="try-this-first" className="mb-10">
      <h2 id="try-this-first" className="dir-bar">
        Try this first
      </h2>
      <p className="mt-3 font-semibold text-[var(--dir-muted)]">{tryThis.lead}</p>
      <ul>
        {tryThis.prompts.map((prompt) => (
          <li key={prompt.skillId} className="border-b border-[var(--dir-rule)]! py-3">
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
