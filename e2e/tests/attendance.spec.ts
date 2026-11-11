import { expect, test } from '@playwright/test';
import { checkInViaApi, createEmployee } from '../support/api';
import type { TestEmployee } from '../support/api';
import { logInAsHrdAdmin } from '../support/ui';

let first: TestEmployee;
let second: TestEmployee;

test.beforeAll(async () => {
  first = await createEmployee({ department: 'Quality' });
  second = await createEmployee({ department: 'Support' });
  await checkInViaApi(first);
  await checkInViaApi(second);
});

test.describe('HRD: attendance', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsHrdAdmin(page);
    await page.getByRole('link', { name: 'Attendance' }).click();
    await expect(
      page.getByRole('heading', { name: 'Attendance' }),
    ).toBeVisible();
  });

  test('records show the employee name and department from the employee service', async ({
    page,
  }) => {
    const row = page.getByRole('row').filter({ hasText: first.name });
    await expect(row).toContainText('Quality');
    await expect(row).toContainText(/\d{4}-\d{2}-\d{2}/);
  });

  test('the employee filter narrows the list to one person', async ({
    page,
  }) => {
    await page.getByLabel('Employee').selectOption({ label: second.name });
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText(second.name);
    await expect(page.getByText('Showing 1–1 of 1')).toBeVisible();
  });

  test('a date range with no records shows an empty message, and reset restores the list', async ({
    page,
  }) => {
    await page.getByLabel('From work date').fill('2099-01-01');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByText('No attendance records match these filters.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('tbody')).toContainText(first.name);
  });

  test('a photo opens in a dialog, loaded with the token, and Escape closes it', async ({
    page,
  }) => {
    const photoRequest = page.waitForRequest((request) =>
      request.url().endsWith('/photo'),
    );
    await page
      .getByRole('row')
      .filter({ hasText: first.name })
      .getByRole('button', { name: 'View photo' })
      .click();

    // An <img src> could not send this header; the app fetches the photo itself.
    expect((await photoRequest).headers().authorization).toMatch(/^Bearer /);

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('img')).toHaveAttribute('src', /^blob:/);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('records are still listed when employee details are unavailable', async ({
    page,
  }) => {
    // The gateway answers like this when the employee service is down (graceful degradation).
    // Stopping a real service from a test is not practical, so that answer is simulated here.
    await page.route('**/attendance-records?*', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.items = body.items.map((item: object) => ({
        ...item,
        employee: null,
      }));
      await route.fulfill({ response, json: body });
    });

    await page.reload();
    await expect(page.getByText('details unavailable').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'View photo' }).first(),
    ).toBeVisible();
  });
});
