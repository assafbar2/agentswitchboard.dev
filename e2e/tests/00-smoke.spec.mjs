import { test, expect } from './fixtures.mjs';
test('homepage loads with the headline', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Every AI Agent Worth Knowing');
});
