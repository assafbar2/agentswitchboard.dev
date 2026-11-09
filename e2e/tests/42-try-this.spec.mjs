// "Try this first" prompts on listing pages (lib/try-this.ts,
// components/TryThisFirst.tsx), checked against the listing's API record.
import { test, expect } from './fixtures.mjs';

const UA = { 'user-agent': 'asb-e2e (try-this)' };
const SLOT = /: ‹(what you're looking for|your question|what you need)›$/;

async function apiRecord(request, slug) {
  const res = await request.get(`/api/agents/${slug}`, { headers: UA });
  expect(res.status(), `/api/agents/${slug}`).toBe(200);
  return res.json();
}

const section = (page) => page.locator('div.human-only.section').getByRole('region', { name: 'Try this first' });

/** Each prompt on the page as { skill, text }. */
async function prompts(page) {
  return section(page)
    .locator('li')
    .evaluateAll((items) => items.map((li) => ({ skill: li.querySelector('.dir-label').textContent, text: li.querySelector('p').textContent })));
}

for (const [slug, lead] of [
  ['agentmail', 'Ask your assistant, with AgentMail connected:'], // mcp + api + cli
  ['opencode', 'Ask your coding agent:'], // cli only
  ['typesense', 'Ask your coding agent:'], // api only
]) {
  test(`/agents/${slug}: up to three prompts, each from one of its skills`, async ({ page }) => {
    const rec = await apiRecord(page.request, slug);
    await page.goto(`/agents/${slug}`);
    await expect(section(page).getByText(lead, { exact: true })).toBeVisible();
    const shown = await prompts(page);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThanOrEqual(3);
    const skillNames = rec.skills.map((s) => s.name);
    for (const { skill, text } of shown) {
      expect(skillNames, text).toContain(skill);
      expect(text.startsWith(`Use ${rec.name} to `), text).toBe(true);
      expect(text).toMatch(SLOT);
    }
  });
}

test('a listing reached only as a browser extension has no prompts', async ({ page }) => {
  const rec = await apiRecord(page.request, 'cline');
  expect(rec.accessMethods).toEqual(['browser-extension']);
  await page.goto('/agents/cline');
  await expect(page.locator('div.human-only.section').getByRole('heading', { level: 1 })).toHaveText(rec.name);
  await expect(section(page)).toHaveCount(0);
});

test.describe('copying a prompt', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the prompt as shown, confirms, and counts try_prompt_copy', async ({ page }) => {
    const rec = await apiRecord(page.request, 'agentmail');
    await page.goto('/agents/agentmail');
    const [first] = await prompts(page);
    // Found by its row: the button's name changes to "Copied…" on click.
    const button = section(page).locator('li').first().getByRole('button');
    await expect(button).toHaveAccessibleName(`Copy the ${first.skill} prompt`);
    await button.click();
    await expect(button).toHaveText(/Copied/);
    await expect(section(page).getByRole('status').first()).toHaveText('Copied to the clipboard');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first.text);

    // The analytics script is blocked (fixtures.mjs), so the event waits in its queue.
    const events = await page.evaluate(() =>
      (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === 'try_prompt_copy').map(([, e]) => e.data)
    );
    const skill = rec.skills.find((s) => s.name === first.skill);
    expect(events).toEqual([{ slug: 'agentmail', skill: skill.id }]);

    await expect(button).toHaveText(/^Copy\b/, { timeout: 5000 });
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the prompts are plain text and no copy button shows', async ({ page }) => {
    await page.goto('/agents/agentmail');
    const shown = await prompts(page);
    expect(shown.length).toBeGreaterThan(0);
    await expect(section(page).getByText(shown[0].text, { exact: true })).toBeVisible();
    await expect(section(page).getByRole('button')).toHaveCount(0);
  });
});

test('text-only view lists the same prompts', async ({ page }) => {
  await page.goto('/agents/agentmail');
  const shown = await prompts(page);
  const bar = page.getByRole('complementary', { name: 'For AI agents' });
  await bar.getByRole('button', { name: /Switch to text-only view/ }).click();
  const agentView = page.locator('div.agent-only').last();
  await expect(agentView.locator('.agent-section-title', { hasText: 'try this first' })).toBeVisible();
  await expect(agentView.getByText('Ask your assistant, with AgentMail connected:', { exact: true })).toBeVisible();
  for (const { text } of shown) {
    await expect(agentView.locator('.agent-row .agent-accent', { hasText: text })).toHaveCount(1);
  }
});
