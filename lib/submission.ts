/**
 * Files a directory submission as a GitHub issue on the PUBLIC directory repo
 * (label: "submission"). That issue notifies the maintainer and is where the
 * decision is posted. Shared by the /submit form and the MCP submit_listing
 * tool, so both land in the same review queue.
 *
 * The submitter's email never goes on the issue. If AGENTMAIL_API_KEY is set,
 * a private copy (submission + email + issue link) is sent to the maintainer's
 * AgentMail inbox. If there is no email, the key is missing, or the send
 * fails, the address is dropped: it is not logged or recorded anywhere, and
 * the submission still succeeds.
 *
 * Requires GITHUB_ISSUES_TOKEN in the environment (fine-grained token,
 * Issues: write).
 */

const REPO = 'assafbar2/agentswitchboard.dev';
const ISSUE_URL_PREFIX = `https://github.com/${REPO}/issues/`;
const MAINTAINER_INBOX = 'barnir@agentmail.to';
const AGENTMAIL_SEND_URL =
  'https://api.agentmail.to/v0/inboxes/barnir%40agentmail.to/messages/send';
const PRIVATE_SEND_TIMEOUT_MS = 8000;
const GITHUB_TIMEOUT_MS = 10000;

export type SubmissionSource = 'form' | 'mcp';

const SOURCE_LABEL: Record<SubmissionSource, string> = {
  form: '/submit form',
  mcp: 'MCP submit_listing tool',
};

export type SubmissionResult =
  | { ok: true; issueUrl?: string }
  | { ok: false; reason: 'not_configured' | 'failed' };

/** Removes the submitter's own address if they also typed it into the public text. */
export function withoutEmail(text: string, email: string): string {
  if (!email) return text;
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), '[email removed]');
}

/**
 * Breaks GitHub @mentions so a public submission cannot ping people. A word
 * character before the @ (as in an email address) is left alone.
 */
export function withoutMentions(text: string): string {
  return text.replace(/(^|[^\w`])@(?=[A-Za-z0-9-])/g, '$1@\u200b');
}

/**
 * Best-effort private delivery of the submitter's email. Never throws, and
 * never logs anything that contains the address.
 */
async function sendPrivateCopy(
  ask: string,
  email: string,
  issueUrl: string | undefined,
  source: SubmissionSource
): Promise<void> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return;

  const issueRef = issueUrl ? `#${issueUrl.slice(ISSUE_URL_PREFIX.length)}` : '(no issue link)';
  const subject = `Submission contact ${issueRef}: ${withoutEmail(ask, email)
    .slice(0, 60)
    .replace(/\s+/g, ' ')}`;
  const text = [
    `New submission from the ${SOURCE_LABEL[source]}.`,
    '',
    `Public issue: ${issueUrl ?? '(link unavailable)'}`,
    `Contact email (private, not on the issue): ${email}`,
    '',
    'Submission:',
    '',
    ask,
  ].join('\n');

  try {
    const res = await fetch(AGENTMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: [MAINTAINER_INBOX], subject, text }),
      signal: AbortSignal.timeout(PRIVATE_SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[submit] private contact copy failed: HTTP ${res.status}`);
    }
  } catch (err) {
    // Log only the error type: messages can echo request details.
    console.error(
      `[submit] private contact copy failed: ${err instanceof Error ? err.name : 'unknown error'}`
    );
  }
}

/**
 * Opens the public issue, then sends the private contact copy when an email
 * was given. Callers validate `ask` and `email` first.
 */
export async function fileSubmission(input: {
  ask: string;
  email?: string;
  source: SubmissionSource;
}): Promise<SubmissionResult> {
  const { ask, source } = input;
  const email = input.email?.trim() ?? '';

  const token = process.env.GITHUB_ISSUES_TOKEN;
  if (!token) return { ok: false, reason: 'not_configured' };

  // Everything below goes on a public issue: it must never contain the email.
  const publicAsk = withoutMentions(withoutEmail(ask, email));
  const title = `Submission: ${publicAsk.slice(0, 60).replace(/\s+/g, ' ')}${publicAsk.length > 60 ? '…' : ''}`;
  const body = [
    `## Directory submission (via ${SOURCE_LABEL[source]})`,
    '',
    '**Ask:**',
    '',
    publicAsk,
    '',
    email ? '**Contact:** withheld from this public issue.' : '**Contact:** none given.',
    '',
    '---',
    '_Review flow: verify endpoints & signals, then add via a content PR (see CONTRIBUTING.md). Post the decision on this issue._',
  ].join('\n');

  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, labels: ['submission'] }),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: 'failed' };
  }

  if (!res.ok) return { ok: false, reason: 'failed' };

  let issueUrl: string | undefined;
  try {
    const created = (await res.json()) as { html_url?: unknown };
    if (typeof created.html_url === 'string' && created.html_url.startsWith(ISSUE_URL_PREFIX)) {
      issueUrl = created.html_url;
    }
  } catch {
    // The issue exists; we just can't link to it.
  }

  if (email) await sendPrivateCopy(ask, email, issueUrl, source);

  return { ok: true, issueUrl };
}
