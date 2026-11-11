# WFH Attendance System

A web application for recording work-from-home attendance, built for the Dexa Group fullstack technical test.

- **Employees** log in and check in once per day by uploading a photo as proof that they are working from home. The server records the date and time.
- **HRD admins** manage employee master data (add, update, deactivate) and view submitted attendance, including the photos. Attendance is view-only.

**Stack:** React 19 + TypeScript (Vite) · NestJS 12 microservices over TCP · MySQL 8.4 · TypeORM

## Architecture

```
React frontend (employee screens + HRD screens)
        │  HTTP + JSON, Bearer token
   API Gateway :3000     authenticates, checks roles, validates input,
        │                orchestrates calls, combines responses; owns no data
        │  NestJS TCP transport (not reachable from outside)
   ┌────┴────────┬───────────────┐
  Auth :4001   Employee :4002   Attendance :4003
  credentials  master data      records + photo files
   │             │               │
  auth_db      employee_db      attendance_db     one MySQL instance, one MySQL user
                                                  per service with access to its own database only
```

The backend is split by **data ownership**: each service owns one kind of data and is the only code that can read or write it. Login credentials are separated from employee master data mainly to limit the exposure of sensitive data, and also because the two change independently. The database server enforces the boundary too, because each service's MySQL user has privileges on its own database alone.

The full design is in [`docs/design.md`](docs/design.md): schema, the internal contract between the gateway and the services, the HTTP API, the cross-service rules (compensation when creating an employee, fail-closed deactivation, graceful degradation), and security notes.

## Running it locally

**Prerequisites:** Node.js 22.22 or newer (developed on 26), npm, and Docker with the Compose plugin.

### 1. Configuration and database

```bash
git clone https://github.com/varrentnw/wfh-attendance-system.git
cd wfh-attendance-system
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up -d
```

This starts MySQL 8.4 and, on the first start, creates the three databases and the three MySQL users (`docker/mysql/init.sql`). The values in `.env.example` work as they are for local development.

### 2. Backend

```bash
cd backend
npm install
npm run start:all
```

`start:all` runs the gateway and the three services together. Wait until all four report `successfully started`. In development the services create their own tables on first start.

Then, in a second terminal, create the first accounts:

```bash
cd backend
npm run seed
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

### Seed accounts

| Username | Password | Role |
|---|---|---|
| `hrd.admin` | `Admin#2026` | HRD admin |
| `dewi.lestari` | `Dewi#2026` | Employee |
| `budi.santoso` | `Budi#2026` | Employee |
| `rina.kartika` | `Rina#2026` | Employee |

These accounts and the database passwords in `docker/mysql/init.sql` are for local development only. The seed script is safe to run more than once. It exists because HRD admin accounts cannot be created through the API: employees created there always receive the employee role.

### A short tour

1. Log in as `dewi.lestari`. Choose a JPEG or PNG photo (up to 5 MB) and check in. The page then shows the check-in time in your browser's time zone. A second check-in on the same day is refused.
2. Log out and log in as `hrd.admin`.
3. **Employees:** search and filter the list, add an employee with a login, and edit one. Setting an employee to inactive also disables their login.
4. **Attendance:** filter by employee or date range, and open a record's photo.

## Project layout

```
backend/                 NestJS monorepo
  apps/gateway/          HTTP API: guards, validation, orchestration, composition
  apps/auth/             credentials, password hashing, token signing
  apps/employee/         employee master data
  apps/attendance/       attendance records and photo files
  libs/common/           shared contracts only (message patterns, payload types, enums)
  scripts/seed.js        first HRD admin and sample employees
frontend/                React app
  src/api/               one function per endpoint, on top of a small fetch client
  src/auth/              session storage, auth context, route guards
  src/components/        reusable components (form fields, pagination, error list, photo dialog, ...)
  src/pages/             one component per screen
docker/mysql/init.sql    databases and per-service MySQL users
docs/design.md           the design in full
wfh-attendance/          Bruno collection of API requests
```

## Assumptions

- "Today" is defined by WIB (Asia/Jakarta), the company's headquarters time zone. The server derives the work date; the browser only displays times in the viewer's own time zone.
- One check-in per employee per day. The brief does not ask for check-out.
- HRD admins are employees too, but their accounts are for administration and do not check in.
- Employees see only today's status, not their history. The brief does not ask for history.
- Employees are deactivated, never deleted, so their attendance history stays linked to a valid record.

## Testing

- **API:** the Bruno collection in `wfh-attendance/` holds the requests used to test the backend by hand, including failure paths: validation, rejected undeclared fields (mass assignment), duplicate email and username, role checks, compensation when creating an employee (with a fault injected), fail-closed deactivation and reactivation, graceful degradation, and file checks.
- **Frontend:** every screen was exercised in a browser against the running backend: login and role-based routing, check-in with its error cases, employee search, creation, editing and deactivation, pagination, the attendance list with photos, an invalid token, and the attendance list while the employee service is stopped.
- **Gap:** there are no automated tests in the repository. NestJS 12 packages are ESM-only; the application runs under CommonJS, but Jest fails to load them. With more time I would move the backend to ESM (or to a test runner with native ESM support) and add unit tests for the services and end-to-end tests for the API.

## Known limitations

- A token issued before an account is deactivated stays valid until it expires (1 hour). The fix is for the gateway to check the account's status on every request.
- The frontend keeps the token in `localStorage`, which survives a refresh but could be read by an injected script. An `httpOnly` cookie with CSRF protection would close that gap.
- A login with an unknown username responds slightly faster than one with a wrong password, which could reveal which usernames exist.
- A crash between saving an attendance record and writing its photo would leave a record without a file.
- The attendance screen's employee filter lists the first 100 employees, and the department filter on the employee screen needs an exact match.
- Tables are created by TypeORM's `synchronize` in development. Production would use reviewed migrations, a secrets manager, and separate database users for running and migrating.

More are listed, with the reasoning, under "Future improvements" in [`docs/design.md`](docs/design.md): object storage for photos, rate limiting on login, observability across services, a departments table, and attendance filtering by department.

## Use of AI

The brief allows AI tools, and I used Claude (Anthropic) throughout.

- **Backend and design:** I used it as a tutor. I learned NestJS, TypeORM and the microservice patterns during this project, wrote the first instance of each kind of component myself, and had repeated boilerplate generated and then reviewed it.
- **Frontend:** React was new to me. With the same tutoring I wrote the login page, the route guards, the routes and the first components myself. The API client and the auth context were generated and explained to me. Because of the deadline, the remaining screens (check-in, employees, attendance), the stylesheet, the seed script and the first draft of this README were generated by Claude. I reviewed and tested them, and those commits are marked as co-authored.

I can explain the design decisions and the code in this repository, and I am glad to walk through any part of it.
