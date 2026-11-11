import { expect, test } from '@playwright/test';
import { createEmployee, HRD_ADMIN } from '../support/api';
import { errorList, logIn, logInAsHrdAdmin } from '../support/ui';

test.describe('Login and access control', () => {
  test('a visitor who is not logged in is sent to the login page', async ({
    page,
  }) => {
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a wrong password shows one generic message', async ({ page }) => {
    await logIn(page, HRD_ADMIN.username, 'not-the-password');
    await expect(errorList(page)).toHaveText('Invalid username or password');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('an empty form lists every validation failure', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Login' }).click();
    // The count is polled, because the messages appear only after the server answers.
    await expect
      .poll(() => errorList(page).getByRole('listitem').count())
      .toBeGreaterThan(1);
  });

  test('an HRD admin lands on the employee list and cannot open the check-in page', async ({
    page,
  }) => {
    await logInAsHrdAdmin(page);
    await expect(
      page.getByRole('heading', { name: 'Employees' }),
    ).toBeVisible();

    await page.goto('/check-in');
    await expect(page).toHaveURL(/\/employees$/);
  });

  test('an employee lands on the check-in page and cannot open HRD pages', async ({
    page,
  }) => {
    const employee = await createEmployee();
    await logIn(page, employee.username, employee.password);
    await expect(page).toHaveURL(/\/check-in$/);
    await expect(page.getByRole('link', { name: 'Employees' })).toHaveCount(0);

    await page.goto('/attendance');
    await expect(page).toHaveURL(/\/check-in$/);
  });

  test('changing the stored role reveals a screen but no data', async ({
    page,
  }) => {
    const employee = await createEmployee();
    await logIn(page, employee.username, employee.password);
    await expect(page).toHaveURL(/\/check-in$/);

    // The frontend is not a security boundary: the gateway checks the signed token.
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('wfh.session')!);
      session.role = 'HRD_ADMIN';
      localStorage.setItem('wfh.session', JSON.stringify(session));
    });
    await page.goto('/employees');
    await expect(errorList(page)).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test('logging out returns to the login page and clears the session', async ({
    page,
  }) => {
    await logInAsHrdAdmin(page);
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      await page.evaluate(() => localStorage.getItem('wfh.session')),
    ).toBeNull();
  });

  test('a token the server rejects ends the session', async ({ page }) => {
    await logInAsHrdAdmin(page);
    await page.evaluate(() => {
      const session = JSON.parse(localStorage.getItem('wfh.session')!);
      session.accessToken = `${session.accessToken.slice(0, -2)}xx`;
      localStorage.setItem('wfh.session', JSON.stringify(session));
    });
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    expect(
      await page.evaluate(() => localStorage.getItem('wfh.session')),
    ).toBeNull();
  });
});
