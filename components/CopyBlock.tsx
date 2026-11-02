import { CopyButton } from '@/components/CopyButton';

const BOX = 'mt-1 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3';

/** A label and its copy button over the text it copies, shown in full so nothing needs JavaScript. */
export function CopyBlock({
  label,
  text,
  what,
  event,
  data,
  prose = false,
}: {
  label: string;
  text: string;
  what: string;
  event: string;
  data: Record<string, string | number | boolean>;
  prose?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <span className="dir-label min-w-0 text-[var(--dir-muted)]">{label}</span>
        <CopyButton text={text} what={what} event={event} data={data} />
      </div>
      {prose ? (
        <p className={`${BOX} text-[16px] font-semibold leading-snug wrap-break-word`}>{text}</p>
      ) : (
        <pre className={`${BOX} mono overflow-x-auto text-[13px] leading-relaxed`}>{text}</pre>
      )}
    </div>
  );
}
