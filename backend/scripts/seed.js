/**
 * Creates the first HRD admin and a few sample employees, so the app can be used right after setup.
 *
 * HRD admin accounts cannot be created through the API (it always assigns the EMPLOYEE role),
 * so this script writes to the databases directly. It still respects ownership: each row is
 * written through the MySQL user of the service that owns the table.
 *
 * Safe to run more than once: a username that already exists is skipped.
 * Run the services once before this script, because they create the tables in development.
 */
const path = require('node:path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

process.loadEnvFile(path.resolve(__dirname, '../../.env'));

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

async function main() {
  const authDb = await connect('AUTH');
  const employeeDb = await connect('EMPLOYEE');
  try {
    for (const user of SEED_USERS) {
      await seedUser(authDb, employeeDb, user);
    }
  } finally {
    await authDb.end();
    await employeeDb.end();
  }
}

main().catch((error) => {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    console.error('The tables do not exist yet. Start the services once so they create them, then run the seed again.');
  } else {
    console.error(`Seeding failed: ${error.message}`);
  }
  process.exit(1);
});
