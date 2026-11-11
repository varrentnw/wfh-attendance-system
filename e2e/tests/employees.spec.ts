import { expect, test } from '@playwright/test';
import { createEmployee, loginViaApi, uniqueKey } from '../support/api';
import { errorList, logInAsHrdAdmin } from '../support/ui';

test.describe('HRD: employees', () => {
  test.beforeEach(async ({ page }) => {
    await logInAsHrdAdmin(page);
  });

  test('the add form reports validation failures and conflicts, then creates the employee', async ({
    page,
  }) => {
    const existing = await createEmployee();
    const key = uniqueKey();

    await page.getByRole('link', { name: 'Add employee' }).click();
    await page.getByRole('button', { name: 'Create employee' }).click();
    await expect
      .poll(() => errorList(page).getByRole('listitem').count())
      .toBeGreaterThan(4);

    await page.getByLabel('Full name').fill(`E2E ${key} Created`);
    await page.getByLabel('Email').fill(existing.email);
    await page.getByLabel('Department').fill('Quality');
    await page.getByLabel('Position').fill('Tester');
    await page.getByLabel('Username').fill(existing.username);
    await page.getByLabel('Initial password').fill('E2e#Password1');

    await page.getByRole('button', { name: 'Create employee' }).click();
    await expect(errorList(page)).toHaveText('Username already exists');

    await page.getByLabel('Username').fill(`e2e.${key}`);
    await page.getByRole('button', { name: 'Create employee' }).click();
    await expect(errorList(page)).toHaveText('Email already exists');

    await page.getByLabel('Email').fill(`e2e.${key}@example.com`);
    await page.getByRole('button', { name: 'Create employee' }).click();
    await expect(page).toHaveURL(/\/employees$/);

    await page.getByLabel('Name or email').fill(`E2E ${key} Created`);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // The login that was created with the employee works.
    expect((await loginViaApi(`e2e.${key}`, 'E2e#Password1')).status).toBe(200);
  });

  test('search, status filter and reset change the list', async ({ page }) => {
    const employee = await createEmployee();

    await page.getByLabel('Name or email').fill(employee.email);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText(employee.name);

    await page.getByLabel('Status').selectOption('INACTIVE');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByText('No employees match these filters.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByLabel('Name or email')).toHaveValue('');
    // Without filters the list holds more than this one employee again.
    await expect
      .poll(() => page.locator('tbody tr').count())
      .toBeGreaterThan(1);
  });

  test('pagination moves through a list longer than one page', async ({
    page,
  }) => {
    // Eleven employees that share a name no other test uses, so the count is exact.
    const group = `E2E ${uniqueKey()} Page`;
    for (let i = 0; i < 11; i += 1) {
      await createEmployee({ name: `${group} ${i}` });
    }

    await page.getByLabel('Name or email').fill(group);
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByText('Showing 1–10 of 11')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Showing 11–11 of 11')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('editing sends only the changed field, and nothing when nothing changed', async ({
    page,
  }) => {
    const employee = await createEmployee();
    const patchBodies: unknown[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PATCH') {
        patchBodies.push(request.postDataJSON());
      }
    });

    await page.goto(`/employees/${employee.employeeId}/edit`);
    await expect(page.getByLabel('Full name')).toHaveValue(employee.name);
    await page.getByLabel('Position').fill('Senior Tester');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/employees$/);
    expect(patchBodies).toEqual([{ position: 'Senior Tester' }]);

    await page.goto(`/employees/${employee.employeeId}/edit`);
    await expect(page.getByLabel('Position')).toHaveValue('Senior Tester');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/employees$/);
    expect(patchBodies).toHaveLength(1);
  });

  test('an email that belongs to someone else is refused', async ({ page }) => {
    const employee = await createEmployee();
    const other = await createEmployee();

    await page.goto(`/employees/${employee.employeeId}/edit`);
    await page.getByLabel('Email').fill(other.email);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(errorList(page)).toHaveText('Email already exists');
    await expect(page).toHaveURL(/\/edit$/);
  });

  test('deactivating an employee disables their login, and reactivating restores it', async ({
    page,
  }) => {
    const employee = await createEmployee();
    expect(
      (await loginViaApi(employee.username, employee.password)).status,
    ).toBe(200);

    await page.goto(`/employees/${employee.employeeId}/edit`);
    await page.getByLabel('Employment status').selectOption('INACTIVE');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/employees$/);

    await page.getByLabel('Name or email').fill(employee.email);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(
      page.getByRole('row').filter({ hasText: employee.email }),
    ).toContainText('Inactive');
    expect(
      (await loginViaApi(employee.username, employee.password)).status,
    ).toBe(401);

    await page.goto(`/employees/${employee.employeeId}/edit`);
    await page.getByLabel('Employment status').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/employees$/);
    expect(
      (await loginViaApi(employee.username, employee.password)).status,
    ).toBe(200);
  });

  test('an employee id that does not exist shows a message and a way back', async ({
    page,
  }) => {
    await page.goto('/employees/999999999/edit');
    await expect(errorList(page)).toHaveText('Employee not found');
    await expect(
      page.getByRole('link', { name: 'Back to employees' }),
    ).toBeVisible();
  });
});
