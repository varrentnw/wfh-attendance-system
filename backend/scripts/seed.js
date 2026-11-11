/**
 * Creates the first HRD admin and a few sample employees, so the app can be used right after setup.
 *
 * HRD admin accounts cannot be created through the API (it always assigns the EMPLOYEE role),
 * so this script writes to the databases directly. It still respects ownership: each row is
 * written through the MySQL user of the service that owns the table.
 *
 * Safe to run more than once: a username that already exists is skipped.
 * The services create the tables when they first start, so the script waits for the tables
 * for a while before it gives up.
 */
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Locally the settings come from the root .env file. In a container there is no file:
// Compose passes the same settings as environment variables.
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const BCRYPT_COST = 12; // the same cost factor the auth service uses

const SEED_USERS = [
  {
    name: 'Sari Wulandari',
    email: 'sari.wulandari@example.com',
    department: 'Human Resources',
    position: 'HRD Administrator',
    username: 'hrd.admin',
    password: 'Admin#2026',
    role: 'HRD_ADMIN',
  },
  {
    name: 'Dewi Lestari',
    email: 'dewi.lestari@example.com',
    department: 'Engineering',
    position: 'Software Engineer',
    username: 'dewi.lestari',
    password: 'Dewi#2026',
    role: 'EMPLOYEE',
  },
  {
    name: 'Budi Santoso',
    email: 'budi.santoso@example.com',
    department: 'Finance',
    position: 'Accountant',
    username: 'budi.santoso',
    password: 'Budi#2026',
    role: 'EMPLOYEE',
  },
  {
    name: 'Rina Kartika',
    email: 'rina.kartika@example.com',
    department: 'Engineering',
    position: 'QA Engineer',
    username: 'rina.kartika',
    password: 'Rina#2026',
    role: 'EMPLOYEE',
  },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env first.`);
  }
  return value;
}

function connect(prefix) {
  return mysql.createConnection({
    host: requireEnv('DB_HOST'),
    port: Number(requireEnv('DB_PORT')),
    user: requireEnv(`${prefix}_DB_USER`),
    password: requireEnv(`${prefix}_DB_PASSWORD`),
    database: requireEnv(`${prefix}_DB_NAME`),
    timezone: 'Z',
  });
}

async function findOrCreateEmployee(employeeDb, user) {
  const [existing] = await employeeDb.execute(
    'SELECT employee_id FROM employees WHERE email = ?',
    [user.email],
  );
  if (existing.length > 0) {
    return existing[0].employee_id;
  }
  const [result] = await employeeDb.execute(
    'INSERT INTO employees (name, email, department, position) VALUES (?, ?, ?, ?)',
    [user.name, user.email, user.department, user.position],
  );
  return result.insertId;
}

async function seedUser(authDb, employeeDb, user) {
  const [existing] = await authDb.execute(
    'SELECT credential_id FROM credentials WHERE username = ?',
    [user.username],
  );
  if (existing.length > 0) {
    console.log(`skipped  ${user.username} (already exists)`);
    return;
  }

  // Same order as the gateway: the employee first, then the credential that refers to it.
  const employeeId = await findOrCreateEmployee(employeeDb, user);
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST);
  await authDb.execute(
    'INSERT INTO credentials (employee_id, username, password_hash, role) VALUES (?, ?, ?, ?)',
    [employeeId, user.username, passwordHash, user.role],
  );
  console.log(`created  ${user.username} (${user.role}, employee ${employeeId})`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Not ready yet: MySQL is still starting, or a service has not created its table.
const NOT_READY_CODES = [
  'ER_NO_SUCH_TABLE',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
];
const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2000;

async function seedAll() {
  const authDb = await connect('AUTH');
  try {
    const employeeDb = await connect('EMPLOYEE');
    try {
      for (const user of SEED_USERS) {
        await seedUser(authDb, employeeDb, user);
      }
    } finally {
      await employeeDb.end();
    }
  } finally {
    await authDb.end();
  }
}

async function main() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await seedAll();
      return;
    } catch (error) {
      if (!NOT_READY_CODES.includes(error.code) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      console.log(`not ready yet (${error.code}), retrying in 2 s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

main().catch((error) => {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    console.error(
      'The tables do not exist. Start the services so they create them, then run the seed again.',
    );
  } else {
    console.error(`Seeding failed: ${error.message}`);
  }
  process.exit(1);
});
