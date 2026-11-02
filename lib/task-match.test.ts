import { describe, expect, it } from 'vitest';
import { matchTask, namedKeywords, ownWords, rankTasks, TASK_MATCH_MIN, type TaskTerms } from './task-match';
import { getTasks } from './tasks';

const tasks = getTasks();
const slugOf = (text: string) => matchTask(text, tasks)?.slug ?? null;

function task(slug: string, label: string, keywords: string[]): TaskTerms {
  return { slug, label, keywords };
}

describe('matchTask, against content/tasks.json', () => {
  it('picks each task by its own label', () => {
    for (const t of tasks) expect(slugOf(t.label), t.label).toBe(t.slug);
  });

  it('picks each task by any keyword no other task has', () => {
    const owners = new Map<string, number>();
    for (const t of tasks) for (const k of t.keywords) owners.set(k, (owners.get(k) ?? 0) + 1);
    for (const t of tasks) {
      for (const k of t.keywords) if (owners.get(k) === 1) expect(slugOf(k), k).toBe(t.slug);
    }
  });

  it.each([
    ['read my email', 'send-and-read-email'],
    ['Send EMAILS!', 'send-and-read-email'],
    ['query postgres', 'query-a-database'],
    ['a postgres mcp server', 'query-a-database'],
    ['chat with my db', 'query-a-database'],
    ['scrape amazon prices', 'scrape-websites'],
    ['search the internet', 'search-the-web'],
    ['browse the web', 'automate-a-browser'],
    ['write code', 'write-and-fix-code'],
    ['review pull requests', 'review-code'],
    ['book meetings', 'schedule-meetings'],
    ['manage my calendar', 'schedule-meetings'],
    ['give my agent memory', 'give-an-agent-memory'],
    ['handle support tickets', 'answer-customer-support'],
    ['answer the phone', 'make-phone-calls'],
    ['make voice calls', 'make-phone-calls'],
    ['analyze data', 'analyze-spreadsheets'],
    ['text to speech', 'build-a-voice-agent'],
    ['create images', 'generate-images'],
    ['edit videos', 'make-videos'],
    ['post on linkedin', 'manage-social-media'],
    ['schedule posts', 'manage-social-media'],
    ['find leads', 'find-sales-leads'],
    ['pay invoices', 'take-payments'],
    ['deploy my app', 'deploy-an-app'],
    ['evaluate my agent', 'evaluate-agents'],
    ['turn figma into react', 'turn-designs-into-code'],
    ['manage my aws', 'manage-cloud-infrastructure'],
  ])('"%s" is %s', (text, slug) => {
    expect(slugOf(text)).toBe(slug);
  });

  it.each([
    ['', 'nothing typed'],
    ['  the  an  ', 'only filler'],
    ['zzqxjv', 'no task word'],
    ['build an agent', 'one label word in two tasks'],
    ['fix bugs', 'one label word'],
    ['speech to text', 'a keyword two tasks share'],
    ['transcribe meetings', 'one word for each of two tasks'],
  ])('"%s" picks no task (%s)', (text) => {
    expect(slugOf(text)).toBeNull();
  });
});

describe('rankTasks', () => {
  it('lists every task the text names, highest score first, ties in task order', () => {
    expect(rankTasks('build an agent', tasks).map(({ task: t, score }) => [t.slug, score])).toEqual([
      ['build-a-voice-agent', 1],
      ['build-a-team-of-agents', 1],
    ]);
    const [first, second] = rankTasks('speech to text', tasks);
    expect([first.task.slug, second.task.slug]).toEqual(['build-a-voice-agent', 'transcribe-audio']);
    expect(first.score).toBe(second.score);
  });

  it('is empty without words that can pick a task', () => {
    expect(rankTasks('', tasks)).toEqual([]);
    expect(rankTasks('to my agents', tasks)).toEqual([]);
  });
});

describe('scoring', () => {
  const mail = task('mail', 'send and read email', ['email', 'inbox']);
  const docs = task('docs', 'read documents', ['pdf']);

  it('counts a typed word twice when it completes a keyword, once when it is only in the label', () => {
    expect(rankTasks('read my email', [mail, docs]).map(({ task: t, score }) => [t.slug, score])).toEqual([
      ['mail', 3],
      ['docs', 1],
    ]);
  });

  it('scores the whole label 3 more', () => {
    expect(rankTasks('send and read email', [mail])[0].score).toBe(2 + 2 + 3);
  });

  it(`needs ${TASK_MATCH_MIN} points and more than any other task`, () => {
    const alone = [task('a', 'track stocks', ['trading'])];
    expect(matchTask('track packages', alone)).toBeNull();
    expect(matchTask('trading', alone)?.slug).toBe('a');
    const twins = [task('a', 'one thing', ['shared']), task('b', 'other thing', ['shared'])];
    expect(matchTask('shared', twins)).toBeNull();
  });

  it('counts a word once, however many keywords have it', () => {
    const voice = task('voice', 'build a voice agent', ['voice agent', 'voice ai']);
    const calls = task('calls', 'make phone calls', ['voice calls']);
    expect(matchTask('voice calls', [voice, calls])?.slug).toBe('calls');
  });

  it('keeps the order of "X to Y" keywords and ignores the order of the rest', () => {
    const tts = task('tts', 'speak', ['text-to-speech']);
    const analysis = task('analysis', 'crunch numbers', ['data analysis']);
    expect(matchTask('text to speech', [tts])?.slug).toBe('tts');
    expect(matchTask('speech to text', [tts])).toBeNull();
    expect(matchTask('analyze data', [analysis])?.slug).toBe('analysis');
  });

  it('matches words give or take an ending', () => {
    const t = task('t', 'unused label', ['scraping', 'invoice', 'billing', 'planning', 'transcription', 'libraries']);
    for (const word of ['scrape', 'invoices', 'bills', 'plan', 'transcribe', 'library']) {
      expect(matchTask(word, [t])?.slug, word).toBe('t');
    }
    for (const word of ['bil', 'metal', 'pay']) expect(matchTask(word, [t]), word).toBeNull();
  });

  it('reads everyday words as the task words they stand for', () => {
    const db = task('db', 'query data', ['database']);
    expect(matchTask('my db', [db])?.slug).toBe('db');
    expect(matchTask('the DB', [db])?.slug).toBe('db');
  });
});

describe('ownWords and namedKeywords', () => {
  const chat = task('chat', 'work in Slack or Teams', ['slack', 'microsoft teams', 'discord']);
  const scan = task('scan', 'scan code for vulnerabilities', ['vulnerability', 'secrets', 'security scan']);

  it("reads a label's lowercase words as the job and its capitalized ones as products", () => {
    expect(ownWords(chat)).toEqual(['work']);
    expect(ownWords(scan)).toEqual(['scan', 'code', 'vulnerabilities']);
  });

  it('lists the keywords the text names, but those the label says', () => {
    expect(namedKeywords('ping me on Discord and Slack', chat)).toEqual(['slack', 'discord']);
    expect(namedKeywords('post in Microsoft Teams', chat)).toEqual(['microsoft teams']);
    expect(namedKeywords('find vulnerabilities and secrets', scan)).toEqual(['secrets']);
    expect(namedKeywords('run a security scan', scan)).toEqual(['security scan']);
    expect(namedKeywords('read email', chat)).toEqual([]);
  });
});
