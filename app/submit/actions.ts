'use server';

/**
 * Submission form handler: files each submission as a GitHub issue on the
 * directory repo (label: "submission"), which notifies the maintainer.
 * Requires GITHUB_ISSUES_TOKEN in the environment (fine-grained token,
 * Issues: write). Without it, the form reports the email fallback.
 */

const REPO = 'assafbar2/agentswitchboard.dev';

export interface SubmitState {
  status: 'idle' | 'ok' | 'error';
  message: string;
}

export async function submitAgent(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // Honeypot: real users never fill this hidden field
  if (formData.get('website')) {
    return { status: 'ok', message: 'Thanks! Your submission is in the review queue.' };
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

  const title = `Submission: ${ask.slice(0, 60).replace(/\s+/g, ' ')}${ask.length > 60 ? '…' : ''}`;
  const body = [
    '## Directory submission (via /submit form)',
    '',
    '**Ask:**',
    '',
    ask,
    '',
    `**Contact:** ${email}`,
    '',
    '---',
    '_Review flow: verify endpoints & signals, then add via a content PR (see CONTRIBUTING.md)._',
  ].join('\n');

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, labels: ['submission'] }),
  });

  if (!res.ok) {
    return {
      status: 'error',
      message: 'Something went wrong filing the submission — email barnir@agentmail.to instead.',
    };
  }

  return { status: 'ok', message: 'Thanks! Your submission is in the review queue — we verify every entry before listing.' };
}
