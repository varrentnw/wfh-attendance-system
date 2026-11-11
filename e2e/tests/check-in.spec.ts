import { expect, test } from '@playwright/test';
import { createEmployee, PHOTO_PATH } from '../support/api';
import type { TestEmployee } from '../support/api';
import { errorList, logIn, logInAsHrdAdmin } from '../support/ui';

// One fresh employee for the whole file, because an employee can check in only once per day.
// The tests run in order and build on each other, like the day of one employee.
test.describe.configure({ mode: 'serial' });

let employee: TestEmployee;

test.beforeAll(async () => {
  employee = await createEmployee();
});

test.describe('Employee check-in', () => {
  test('the form refuses a photo over 5 MB without uploading it', async ({
    page,
  }) => {
    await logIn(page, employee.username, employee.password);
    await expect(page.getByText('You have not checked in today')).toBeVisible();
    const submit = page.getByRole('button', { name: 'Check in' });
    await expect(submit).toBeDisabled();

    let uploads = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        request.url().endsWith('/attendance-records')
      ) {
        uploads += 1;
      }
    });

    await page.getByLabel(/^Photo/).setInputFiles({
      name: 'huge.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
    await expect(errorList(page)).toContainText('larger than 5 MB');
    await expect(submit).toBeDisabled();
    expect(uploads).toBe(0);
  });

  test('the server rejects a file that is not really an image', async ({
    page,
  }) => {
    await logIn(page, employee.username, employee.password);
    // Named and declared as a PNG, but the content is text.
    await page.getByLabel(/^Photo/).setInputFiles({
      name: 'fake.png',
      mimeType: 'image/png',
      buffer: Buffer.from('this is not an image'),
    });
    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(errorList(page)).toHaveText(
      'Photo must be a JPEG or PNG image',
    );
  });

  test('a valid photo is previewed, uploaded, and recorded with a time', async ({
    page,
  }) => {
    await logIn(page, employee.username, employee.password);
    await page.getByLabel(/^Photo/).setInputFiles(PHOTO_PATH);
    await expect(
      page.getByAltText('Preview of the selected photo'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(
      page.getByText(/You checked in on .+\d{2}[:.]\d{2}/),
    ).toBeVisible();
    await expect(
      page.getByText(/Counted for work date \d{4}-\d{2}-\d{2}/),
    ).toBeVisible();
  });

  test('the status survives a refresh, with no form in between', async ({
    page,
  }) => {
    await logIn(page, employee.username, employee.password);
    await expect(page.getByText(/You checked in on/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/You checked in on/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check in' })).toHaveCount(0);
  });

  test('a second check-in on the same day is refused by the server', async ({
    page,
  }) => {
    // Simulates a tab that was opened before the check-in and still shows the form:
    // the status request is answered as "not checked in", so only the server can refuse.
    await page.route('**/me/attendance-records/today', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          statusCode: 404,
          message: 'Not checked in today',
        }),
      }),
    );
    await logIn(page, employee.username, employee.password);
    await page.getByLabel(/^Photo/).setInputFiles(PHOTO_PATH);
    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(errorList(page)).toHaveText('Already checked in today');
  });

  test('HRD sees the record, with the employee name and the photo', async ({
    page,
  }) => {
    await logInAsHrdAdmin(page);
    await page.getByRole('link', { name: 'Attendance' }).click();

    const row = page.getByRole('row').filter({ hasText: employee.name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'View photo' }).click();

    const photo = page.getByRole('dialog').getByRole('img');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('src', /^blob:/);
    // The image really decoded: the fixture is 960 pixels wide.
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(960);
  });
});
