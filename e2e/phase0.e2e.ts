import { expect, test } from '@playwright/test';

test('desktop navigation can open every view without runtime errors', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  for (const tab of ['search', 'scanner', 'merge', 'verification', 'export', 'directory']) {
    await page.locator(`#nav-btn-${tab}`).click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('all six mobile tabs, mock import and local QR remain usable', async ({ page }) => {
  const errors: string[] = [];
  const qrRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('qrserver.com')) qrRequests.push(request.url());
  });
  await page.goto('./');
  await expect(page.getByRole('note')).toContainText('示範版本');

  for (const tab of ['search', 'merge', 'verification', 'export', 'directory', 'scanner']) {
    await page.locator(`#mobile-nav-${tab}`).click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }

  await page.locator('#demo-capture').click();
  await page.getByRole('button', { name: /離線佇列/ }).click();
  await page.getByTestId('scan-queue-item').first().getByRole('button', { name: '匯入名片夾' }).click();
  await page.locator('#mobile-nav-search').click();
  await page.locator('main input[type="text"]').first().fill('林志豪');
  await expect(page.getByText('林志豪', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.locator('#mobile-nav-export').click();
  await expect(page.locator('svg').filter({ has: page.locator('title', { hasText: 'vCard QR Code' }) })).toBeVisible();
  const before = await page.locator('select').inputValue();
  await page.locator('select').selectOption({ index: 1 });
  await expect(page.locator('select')).not.toHaveValue(before);
  expect(errors).toEqual([]);
  expect(qrRequests).toEqual([]);
});
