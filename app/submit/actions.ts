'use server';

/**
 * Submission form handler: validates the form, then files it through
 * lib/submission.ts as a public GitHub issue (label: "submission"). The form
 * requires an email so the maintainer can follow up; it is sent privately and
 * never goes on the issue.
 */

import { fileSubmission } from '@/lib/submission';

export interface SubmitState {
  status: 'idle' | 'ok' | 'error';
  message: string;
  /** The public GitHub issue for this submission, where the decision is posted. */
  issueUrl?: string;
}

const OK_MESSAGE = 'Thanks! Your submission is filed as a public GitHub issue.';
const USE_IT_MAX = 1000;

export async function submitAgent(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  // Honeypot: real users never fill this hidden field
  if (formData.get('website')) {
    return { status: 'ok', message: OK_MESSAGE };
  }

  const ask = String(formData.get('ask') ?? '').trim();
  const useIt = String(formData.get('useit') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();

  if (ask.length < 20) {
    return { status: 'error', message: 'Tell us a bit more — include the agent name and a link (min 20 characters).' };
  }
  if (ask.length > 4000) {
    return { status: 'error', message: 'Please keep it under 4000 characters.' };
  }
  if (useIt.length > USE_IT_MAX) {
    return { status: 'error', message: `Please keep how to start using it under ${USE_IT_MAX} characters.` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Please provide a valid email so we can follow up.' };
  }

  const body = useIt ? `${ask}\n\nHow to start using it (from its docs):\n${useIt}` : ask;
  const result = await fileSubmission({ ask: body, email, source: 'form' });
  if (!result.ok) {
    return {
      status: 'error',
      message:
        result.reason === 'not_configured'
          ? 'Submissions are briefly offline — email barnir@agentmail.to instead.'
          : 'Something went wrong filing the submission — email barnir@agentmail.to instead.',
    };
  }
  return { status: 'ok', message: OK_MESSAGE, issueUrl: result.issueUrl };
}
