import type { Page } from '@playwright/test';
import { HRD_ADMIN } from './api';

export async function logIn(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function logInAsHrdAdmin(page: Page): Promise<void> {
  await logIn(page, HRD_ADMIN.username, HRD_ADMIN.password);
  await page.waitForURL('**/employees');
}

/** The list of error messages a form or page shows. */
export function errorList(page: Page) {
  return page.getByRole('alert');
}
