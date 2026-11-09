/**
 * What a content change does to the rest of the site, as Markdown for the PR
 * description. scripts/drop-impact.ts takes a Snapshot of the catalog at the
 * base ref and one of the working tree; impactReport compares them.
 */

export interface ListingFacts {
  name: string;
  /** Of the listing as the site reads it, to tell edited listings apart. */
  hash: string;
  icon: boolean;
  skills: number;
  /** "Try this first" prompts. */
  prompts: number;
  /** Use it now parts that show a real value: "MCP address", "install command"… */
  setup: string[];
  /** Access methods whose Use it now part falls back to a setup prompt or a docs link. */
  fallbacks: string[];
  /** Up to 8, best first. Related Agents are the first few. */
  alternatives: string[];
}

export interface TaskFacts {
  slug: string;
  label: string;
  /** Every listing that fits, best first. */
  fits: string[];
}

export interface Snapshot {
  listings: Record<string, ListingFacts>;
  tasks: TaskFacts[];
  /** Stack slug → its listings. */
  stacks: Record<string, string[]>;
  /** Curated comparison slug → its listings. */
  comparisons: Record<string, string[]>;
  /** Homepage slots, in order. */
  homepage: string[];
  /** Pages the build makes from the content, each with a share card. */
  pages: number;
}

export interface ReportOptions {
  /** How the base is named in the report: "origin/main (b33dc75)". */
  base: string;
  /** Alternatives a listing needs for its own page. */
  minAlternatives: number;
  /** Related Agents on a listing page. */
  relatedSize: number;
  /** Best fits a task page shows. */
  taskPageSize: number;
}

const FALLBACKS: Record<string, string> = {
  mcp: 'MCP with no address or launch command, so the page shows a setup prompt',
  cli: 'CLI with no install command, so the page links its docs',
  api: 'API with no base URL, so the page links its docs',
};

/** New-listing tables longer than this fold away, so the list of what needs a look stays in view. */
const OPEN_ROWS = 20;

/** "`a`, `b` and 3 more" */
export function slugList(slugs: string[], max = 12): string {
  const shown = slugs.slice(0, max).map((s) => `\`${s}\``);
  const rest = slugs.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  if (shown.length < 2) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "7th", not "#7": in a PR description GitHub links #7 to issue 7. */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${n}${teen ? 'th' : (suffix[n % 10] ?? 'th')}`;
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

export function impactReport(before: Snapshot, after: Snapshot, opts: ReportOptions): string {
  const was = (s: string) => s in before.listings;
  const is = (s: string) => s in after.listings;
  const added = Object.keys(after.listings).filter((s) => !was(s));
  const removed = Object.keys(before.listings).filter((s) => !is(s));
  const kept = Object.keys(after.listings).filter(was);
  const edited = kept.filter((s) => before.listings[s].hash !== after.listings[s].hash);
  const addedSet = new Set(added);

  const out: string[] = ['## What this changes elsewhere', ''];
  out.push(
    `Compared with \`${opts.base}\`: ${plural(added.length, 'listing')} added, ${removed.length} archived, ${edited.length} edited.`
  );
  if (added.length + removed.length + edited.length === 0) {
    out.push('', 'No listing changed.');
  }

  const ranks = new Map<string, { label: string; rank: number }[]>();
  for (const task of after.tasks) {
    task.fits.forEach((slug, i) => ranks.set(slug, [...(ranks.get(slug) ?? []), { label: task.label, rank: i + 1 }]));
  }

  if (added.length > 0) {
    out.push('', '### New listings', '');
    const fold = added.length > OPEN_ROWS;
    if (fold) out.push(`<details><summary>All ${added.length} new listings</summary>`, '');
    out.push('| Listing | Task pages | Try this first | Alternatives | Icon | Use it now |', '|---|---|---|---|---|---|');
    for (const slug of added) {
      const l = after.listings[slug];
      const fits = [...(ranks.get(slug) ?? [])].sort((a, b) => a.rank - b.rank);
      const shown = fits.filter((f) => f.rank <= opts.taskPageSize);
      const below = fits.length - shown.length;
      const top = `the top ${opts.taskPageSize}`;
      let tasks = 'none';
      if (shown.length === 0 && below > 0) tasks = below === 1 ? `fits 1, outside its top ${opts.taskPageSize}` : `fits ${below}, outside their top ${opts.taskPageSize}`;
      else if (shown.length > 0) {
        tasks = shown
          .slice(0, 3)
          .map((f) => `${f.label} (${ordinal(f.rank)})`)
          .join(', ');
        if (shown.length > 3) tasks += ` and ${shown.length - 3} more`;
        if (below > 0) tasks += `; fits ${below} more outside ${top}`;
      }
      const prompts = l.prompts > 0 ? String(l.prompts) : l.skills > 0 ? 'none' : 'no skills';
      const alternatives = `${l.alternatives.length}${l.alternatives.length >= opts.minAlternatives ? ', page' : ''}`;
      out.push(`| \`${slug}\` | ${tasks} | ${prompts} | ${alternatives} | ${l.icon ? 'yes' : 'no'} | ${l.setup.join(', ') || 'none'} |`);
    }
    if (fold) out.push('', '</details>');

    const look: string[] = [];
    const noTask = added.filter((s) => !ranks.has(s));
    if (noTask.length) {
      look.push(
        `Fits no task (${noTask.length}): ${slugList(noTask, 40)}. Check that the description and tags name the job in the words people use, where the product's docs back it.`
      );
    }
    const noPrompts = added.filter((s) => after.listings[s].skills > 0 && after.listings[s].prompts === 0);
    if (noPrompts.length) {
      look.push(
        `Skills but no Try this first prompts (${noPrompts.length}): ${slugList(noPrompts, 40)}. A prompt needs a skill description that opens with an action ("Searches files…").`
      );
    }
    const noIcon = added.filter((s) => !after.listings[s].icon);
    if (noIcon.length) look.push(`No icon (${noIcon.length}): ${slugList(noIcon, 40)}.`);
    for (const [method, text] of Object.entries(FALLBACKS)) {
      const slugs = added.filter((s) => after.listings[s].fallbacks.includes(method));
      if (slugs.length) look.push(`${text} (${slugs.length}): ${slugList(slugs, 40)}.`);
    }
    if (look.length) out.push('', '**Needs a look**', '', ...look.map((l) => `- ${l}`));
  }

  if (removed.length > 0) {
    out.push('', '### Archived listings', '');
    for (const slug of removed) {
      const hadPage = before.listings[slug].alternatives.length >= opts.minAlternatives;
      const notes = [hadPage ? 'its page, share card and alternatives page go away' : 'its page and share card go away'];
      const onTasks = before.tasks.filter((t) => t.fits.slice(0, opts.taskPageSize).includes(slug)).length;
      if (onTasks) notes.push(`it was on ${plural(onTasks, 'task page')}`);
      const asAlternative = Object.values(before.listings).filter((l) => l.alternatives.includes(slug)).length;
      if (asAlternative) notes.push(`an alternative on ${plural(asAlternative, 'listing')}`);
      const stacks = Object.entries(after.stacks)
        .filter(([, items]) => items.includes(slug))
        .map(([stack]) => stack);
      if (stacks.length) notes.push(`**still in stack ${slugList(stacks)}: swap it out**`);
      const comparisons = Object.entries(after.comparisons)
        .filter(([, items]) => items.includes(slug))
        .map(([comparison]) => comparison);
      if (comparisons.length) {
        const one = comparisons.length === 1;
        notes.push(
          `**still in ${one ? 'comparison' : 'comparisons'} ${slugList(comparisons)}: swap it out or remove ${one ? 'that comparison' : 'those comparisons'}**`
        );
      }
      out.push(`- \`${slug}\`: ${notes.join('; ')}.`);
    }
  }

  const pages = (snap: Snapshot) =>
    new Set(Object.keys(snap.listings).filter((s) => snap.listings[s].alternatives.length >= opts.minAlternatives));
  const pagesBefore = pages(before);
  const pagesAfter = pages(after);
  const gained = kept.filter((s) => pagesAfter.has(s) && !pagesBefore.has(s));
  const gainedNew = added.filter((s) => pagesAfter.has(s));
  const lost = kept.filter((s) => pagesBefore.has(s) && !pagesAfter.has(s));
  const onPage = (snap: Snapshot, s: string) =>
    snap.listings[s].alternatives.length >= opts.minAlternatives ? snap.listings[s].alternatives : [];
  const altChanged = kept.filter((s) => !sameList(onPage(before, s), onPage(after, s)));
  const related = (snap: Snapshot, s: string) => snap.listings[s].alternatives.slice(0, opts.relatedSize);
  const relChanged = kept.filter((s) => !sameList(related(before, s), related(after, s)));
  const relNew = kept.filter((s) => related(after, s).some((r) => addedSet.has(r)));

  const elsewhere: string[] = [];
  if (pagesBefore.size !== pagesAfter.size || gained.length || lost.length) {
    const parts = [`Alternatives pages: ${pagesBefore.size} → ${pagesAfter.size}.`];
    if (gainedNew.length) parts.push(`${plural(gainedNew.length, 'new listing gets', 'new listings get')} one.`);
    if (gained.length) parts.push(`${plural(gained.length, 'existing listing gains', 'existing listings gain')} one: ${slugList(gained)}.`);
    if (lost.length) {
      const what = lost.length === 1 ? 'listing loses its page, and that URL' : 'listings lose their pages, and those URLs';
      parts.push(`**${lost.length} ${what} will return 404: ${slugList(lost, 40)}.**`);
    }
    elsewhere.push(parts.join(' '));
  }
  if (altChanged.length || relChanged.length) {
    elsewhere.push(
      `${altChanged.length} existing ${altChanged.length === 1 ? "listing's alternatives page changes" : "listings' alternatives pages change"}, and ${plural(relChanged.length, 'existing listing shows', 'existing listings show')} different Related Agents${relNew.length ? ` (${relNew.length} now ${relNew.length === 1 ? 'includes' : 'include'} a new listing)` : ''}.`
    );
  }

  const beforeTasks = new Map(before.tasks.map((t) => [t.slug, t]));
  const taskLines: string[] = [];
  for (const task of after.tasks) {
    const old = beforeTasks.get(task.slug);
    const best = task.fits.slice(0, opts.taskPageSize);
    if (!old) {
      taskLines.push(`- ${task.label}: new task, ${plural(task.fits.length, 'listing')}`);
      continue;
    }
    const oldBest = old.fits.slice(0, opts.taskPageSize);
    const inn = best.filter((s) => !oldBest.includes(s));
    const gone = oldBest.filter((s) => !best.includes(s));
    if (inn.length || gone.length) {
      taskLines.push(`- ${task.label}: ${[inn.length ? `in ${slugList(inn)}` : '', gone.length ? `out ${slugList(gone)}` : ''].filter(Boolean).join('; ')}`);
    }
  }
  for (const old of before.tasks) {
    if (!after.tasks.some((t) => t.slug === old.slug)) taskLines.push(`- ${old.label}: task removed`);
  }
  if (taskLines.length) {
    elsewhere.push(
      `The ${opts.taskPageSize} best fits change on ${taskLines.length} of ${after.tasks.length} task pages.\n\n  <details><summary>Who comes in and who drops out</summary>\n\n${taskLines.map((l) => `  ${l}`).join('\n')}\n\n  </details>`
    );
  }
  if (!sameList(before.homepage, after.homepage)) {
    elsewhere.push(`Homepage slots, in order: ${slugList(after.homepage)} (were ${slugList(before.homepage)}).`);
  }
  if (after.pages !== before.pages) {
    const n = after.pages - before.pages;
    elsewhere.push(`The build makes ${Math.abs(n)} ${n > 0 ? 'more' : 'fewer'} ${Math.abs(n) === 1 ? 'page' : 'pages'}, each with its share card.`);
  }
  if (elsewhere.length) out.push('', '### Elsewhere on the site', '', ...elsewhere.map((l) => `- ${l}`));

  return `${out.join('\n')}\n`;
}
