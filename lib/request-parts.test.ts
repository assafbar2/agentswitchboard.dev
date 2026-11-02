import { describe, expect, it } from 'vitest';
import { cleanRequest, NEAREST_TASKS, OPERATOR_EXAMPLES, operatorHref, PARTS_MAX, REQUEST_MAX, requestParts } from './request-parts';
import { getTasks } from './tasks';

const tasks = getTasks();
const partsOf = (request: string) => requestParts(request, tasks).parts.map((p) => [p.text, p.task?.slug ?? null]);

describe('requestParts, against content/tasks.json', () => {
  it('ends a part at commas, semicolons, new lines, full stops, "then", "also", "plus" and "as well as"', () => {
    expect(partsOf('read my email, query postgres; scrape websites\ndeploy my app. write code then book meetings')).toEqual([
      ['read my email', 'send-and-read-email'],
      ['query postgres', 'query-a-database'],
      ['scrape websites', 'scrape-websites'],
      ['deploy my app', 'deploy-an-app'],
      ['write code', 'write-and-fix-code'],
      ['book meetings', 'schedule-meetings'],
    ]);
    expect(partsOf('find leads also edit videos plus give my agent memory as well as deploy my app')).toEqual([
      ['find leads', 'find-sales-leads'],
      ['edit videos', 'make-videos'],
      ['give my agent memory', 'give-an-agent-memory'],
      ['deploy my app', 'deploy-an-app'],
    ]);
  });

  it('ends a part at "and", "&" or "+" only when each side names a task alone', () => {
    expect(partsOf('send and read email')).toEqual([['send and read email', 'send-and-read-email']]);
    for (const and of ['and', '&', '+', 'and then']) {
      expect(partsOf(`query postgres ${and} send email`), and).toEqual([
        ['query postgres', 'query-a-database'],
        ['send email', 'send-and-read-email'],
      ]);
    }
  });

  it('gives a part that could be one of two tasks the one no other part names', () => {
    expect(partsOf('translate documents and read pdfs')).toEqual([
      ['translate documents', 'translate-text'],
      ['read pdfs', 'read-pdfs-and-documents'],
    ]);
    expect(partsOf('transcribe my meetings, book meetings')).toEqual([
      ['transcribe my meetings', 'transcribe-audio'],
      ['book meetings', 'schedule-meetings'],
    ]);
  });

  it('joins a part too vague for a task to the part whose task it comes closest to', () => {
    expect(partsOf('send, read and archive email')).toEqual([['send, read and archive email', 'send-and-read-email']]);
  });

  it('makes parts that name the same task one, keeping the order typed', () => {
    expect(partsOf('read email, then send email')).toEqual([['read email, send email', 'send-and-read-email']]);
    expect(partsOf('read email, query postgres, send email')).toEqual([
      ['read email, send email', 'send-and-read-email'],
      ['query postgres', 'query-a-database'],
    ]);
  });

  it('keeps apart parts that name the same task by keywords of their own, but not by the words of its label', () => {
    expect(partsOf('slack and discord')).toEqual([
      ['slack', 'work-in-slack-or-teams'],
      ['discord', 'work-in-slack-or-teams'],
    ]);
    expect(partsOf('answer customer support on zendesk and intercom')).toEqual([
      ['answer customer support on zendesk', 'answer-customer-support'],
      ['intercom', 'answer-customer-support'],
    ]);
    expect(partsOf('scan my repo for secrets and vulnerabilities')).toEqual([
      ['scan my repo for secrets and vulnerabilities', 'scan-for-vulnerabilities'],
    ]);
    expect(partsOf('find leads, enrich them in my CRM')).toEqual([['find leads, enrich them in my CRM', 'find-sales-leads']]);
  });

  it('drops parts of filler and the joining words a part starts with', () => {
    expect(partsOf('please')).toEqual([]);
    expect(partsOf('read my email, please, and slack')).toEqual([
      ['read my email', 'send-and-read-email'],
      ['slack', 'work-in-slack-or-teams'],
    ]);
    expect(partsOf('and then query postgres')).toEqual([['query postgres', 'query-a-database']]);
  });

  it('offers a part without a task the tasks it comes closest to that no other part names', () => {
    const [vague, booked] = requestParts('answer support calls, book meetings', tasks).parts;
    expect(vague.task).toBeNull();
    expect(vague.nearest.map((t) => t.slug)).toEqual(['make-phone-calls', 'answer-customer-support']);
    expect(booked.nearest).toEqual([]);

    const [documents] = requestParts('translate documents', tasks).parts;
    expect(documents.task).toBeNull();
    expect(documents.nearest).toHaveLength(NEAREST_TASKS);

    expect(requestParts('I want a pizza', tasks).parts).toEqual([{ text: 'I want a pizza', task: null, nearest: [] }]);
  });

  it(`puts through the first ${PARTS_MAX} parts and counts the rest`, () => {
    const many = 'read my email, query postgres, scrape websites, deploy my app, write code, book meetings, find leads, edit videos';
    const { parts, extra } = requestParts(many, tasks);
    expect(parts.map((p) => p.task?.slug)).toEqual([
      'send-and-read-email',
      'query-a-database',
      'scrape-websites',
      'deploy-an-app',
      'write-and-fix-code',
      'schedule-meetings',
    ]);
    expect(extra).toBe(2);
  });

  it('names a task in each part of every example request', () => {
    for (const example of OPERATOR_EXAMPLES) {
      const { parts, extra, cut } = requestParts(example, tasks);
      expect(parts.length, example).toBeGreaterThan(1);
      expect(parts.every((p) => p.task), example).toBe(true);
      expect(new Set(parts.map((p) => p.task?.slug)).size, example).toBe(parts.length);
      expect([extra, cut], example).toEqual([0, false]);
    }
  });
});

describe('cleanRequest', () => {
  it('reads the request as one line of text', () => {
    expect(cleanRequest('  read  my\n\nemail \u200e ')).toEqual({ text: 'read my, email', cut: false });
    expect(cleanRequest(',, query postgres ,')).toEqual({ text: 'query postgres', cut: false });
    for (const raw of [undefined, null, 42, ['read email']]) expect(cleanRequest(raw)).toEqual({ text: '', cut: false });
  });

  it(`cuts a request past ${REQUEST_MAX} characters at a word`, () => {
    const long = 'read my email '.repeat(30);
    const { text, cut } = cleanRequest(long);
    expect(cut).toBe(true);
    expect(text.length).toBeLessThanOrEqual(REQUEST_MAX);
    expect(long.startsWith(`${text} `)).toBe(true);
    expect(cleanRequest('x'.repeat(REQUEST_MAX + 50)).text).toHaveLength(REQUEST_MAX);
    expect(requestParts(long, tasks).cut).toBe(true);
  });
});

describe('operatorHref', () => {
  it('links /operator with the request as read', () => {
    expect(operatorHref(' read my Notion,  ping me on Slack ')).toBe('/operator?q=read%20my%20Notion%2C%20ping%20me%20on%20Slack');
    expect(operatorHref('  ')).toBe('/operator');
  });
});
