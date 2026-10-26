'use server';

/**
 * Submission form handler: files each submission as a GitHub issue on the
 * PUBLIC directory repo (label: "submission"). That issue notifies the
 * maintainer and is where the decision is posted.
 *
 * The submitter's email never goes on the issue. If AGENTMAIL_API_KEY is set,
 * a private copy (submission + email + issue link) is sent to the maintainer's
 * AgentMail inbox. If the key is missing or the send fails, the address is
 * dropped: it is not logged or recorded anywhere, and the submission still
 * succeeds.
 *
 * Requires GITHUB_ISSUES_TOKEN in the environment (fine-grained token,
 * Issues: write). Without it, the form reports the email fallback.
 */

const REPO = 'assafbar2/agentswitchboard.dev';
const ISSUE_URL_PREFIX = `https://github.com/${REPO}/issues/`;
const MAINTAINER_INBOX = 'barnir@agentmail.to';
const AGENTMAIL_SEND_URL =
  'https://api.agentmail.to/v0/inboxes/barnir%40agentmail.to/messages/send';
const PRIVATE_SEND_TIMEOUT_MS = 8000;

export interface SubmitState {
  status: 'idle' | 'ok' | 'error';
  message: string;
  /** The public GitHub issue for this submission, where the decision is posted. */
  issueUrl?: string;
}

const OK_MESSAGE = 'Thanks! Your submission is filed as a public GitHub issue.';

/** Removes the submitter's own address if they also typed it into the public text. */
function withoutEmail(text: string, email: string): string {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), '[email removed]');
}

/**
 * Best-effort private delivery of the submitter's email. Never throws, and
 * never logs anything that contains the address.
 */
async function sendPrivateCopy(
  ask: string,
  email: string,
  issueUrl: string | undefined
): Promise<void> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return;

  const issueRef = issueUrl ? `#${issueUrl.slice(ISSUE_URL_PREFIX.length)}` : '(no issue link)';
  const subject = `Submission contact ${issueRef}: ${withoutEmail(ask, email)
    .slice(0, 60)
    .replace(/\s+/g, ' ')}`;
  const text = [
    'New submission from the /submit form.',
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

export async function submitAgent(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // Honeypot: real users never fill this hidden field
  if (formData.get('website')) {
    return { status: 'ok', message: OK_MESSAGE };
  }

  const ask = String(formData.get('ask') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (ask.length < 20) {
    return { status: 'error', message: 'Tell us a bit more — include the agent name and a link (min 20 characters).' };
  }
  if (ask.length > 4000) {
    return { status: 'error', message: 'Please keep it under 4000 characters.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please provide a valid email so we can follow up.' };
  }

  const token = process.env.GITHUB_ISSUES_TOKEN;
  if (!token) {
    return {
      status: 'error',
      message: 'Submissions are briefly offline — email barnir@agentmail.to instead.',
    };
  }

  // Everything below goes on a public issue: it must never contain the email.
  const publicAsk = withoutEmail(ask, email);
  const title = `Submission: ${publicAsk.slice(0, 60).replace(/\s+/g, ' ')}${publicAsk.length > 60 ? '…' : ''}`;
  const body = [
    '## Directory submission (via /submit form)',
    '',
    '**Ask:**',
    '',
    publicAsk,
    '',
    '**Contact:** withheld from this public issue.',
    '',
    '---',
    '_Review flow: verify endpoints & signals, then add via a content PR (see CONTRIBUTING.md). Post the decision on this issue._',
  ].join('\n');

  const failed: SubmitState = {
    status: 'error',
    message: 'Something went wrong filing the submission — email barnir@agentmail.to instead.',
  };

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
    });
  } catch {
    return failed;
  }

  if (!res.ok) {
    return failed;
  }

  let issueUrl: string | undefined;
  try {
    const created = (await res.json()) as { html_url?: unknown };
    if (typeof created.html_url === 'string' && created.html_url.startsWith(ISSUE_URL_PREFIX)) {
      issueUrl = created.html_url;
    }
  } catch {
    // The issue exists; we just can't link to it.
  }

  await sendPrivateCopy(ask, email, issueUrl);

  return { status: 'ok', message: OK_MESSAGE, issueUrl };
}
