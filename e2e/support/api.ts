import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Helpers that talk to the gateway directly. Tests use them to prepare data
 * (an employee, a check-in) so that each test only clicks through the part it is about.
 */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

export const HRD_ADMIN = { username: 'hrd.admin', password: 'Admin#2026' };

export const PHOTO_PATH = path.join(__dirname, '../fixtures/desk.jpg');

export type TestEmployee = {
  employeeId: number;
  name: string;
  email: string;
  username: string;
  password: string;
};

export async function loginViaApi(
  username: string,
  password: string,
): Promise<{ status: number; accessToken?: string }> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = (await response.json()) as { accessToken?: string };
  return { status: response.status, accessToken: body.accessToken };
}

async function adminToken(): Promise<string> {
  const { accessToken } = await loginViaApi(
    HRD_ADMIN.username,
    HRD_ADMIN.password,
  );
  if (!accessToken) {
    throw new Error(
      'Could not log in as hrd.admin. Is the backend running, and has "npm run seed" been run?',
    );
  }
  return accessToken;
}

let counter = 0;

/**
 * A key that is unique per call, so tests never collide with data from earlier runs
 * (employees cannot be deleted through the API). It counts down over time on purpose:
 * lists are ordered by name, so the newest test employees sort first and stay inside
 * the first page of any list.
 */
export function uniqueKey(): string {
  counter += 1;
  const descending = 9_999_999_999_999 - Date.now();
  return `${descending}${String(counter).padStart(2, '0')}`;
}

/** Creates an employee with a login through the API and returns what a test needs to use it. */
export async function createEmployee(
  overrides: Partial<{ name: string; department: string }> = {},
): Promise<TestEmployee> {
  const key = uniqueKey();
  const employee = {
    name: overrides.name ?? `E2E ${key}`,
    email: `e2e.${key}@example.com`,
    department: overrides.department ?? 'Quality',
    position: 'Tester',
    username: `e2e.${key}`,
    password: 'E2e#Password1',
  };
  const response = await fetch(`${API_URL}/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await adminToken()}`,
    },
    body: JSON.stringify(employee),
  });
  if (response.status !== 201) {
    throw new Error(
      `Creating a test employee failed: ${response.status} ${await response.text()}`,
    );
  }
  const created = (await response.json()) as { employeeId: number };
  return { ...employee, employeeId: created.employeeId };
}

/** Checks an employee in through the API, with the fixture photo. */
export async function checkInViaApi(employee: TestEmployee): Promise<void> {
  const { accessToken } = await loginViaApi(
    employee.username,
    employee.password,
  );
  const form = new FormData();
  form.append(
    'photo',
    new Blob([readFileSync(PHOTO_PATH)], { type: 'image/jpeg' }),
    'desk.jpg',
  );
  const response = await fetch(`${API_URL}/attendance-records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (response.status !== 201) {
    throw new Error(
      `Check-in through the API failed: ${response.status} ${await response.text()}`,
    );
  }
}
