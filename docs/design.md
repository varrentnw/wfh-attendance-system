# Design

## Overview

The backend is split into three services, each owning its own data, behind a single API gateway.

- **Auth service** owns login credentials and access rights.
- **Employee service** owns employee master data and employment status.
- **Attendance service** owns attendance records and uploaded photos.

All three databases run on one MySQL instance. Each service connects only to its own database. Ownership is enforced in code, not by the database server.

## Conventions

- **Time.** All `DATETIME` values are stored in UTC. Every database connection is configured with the time zone `+00:00`, so neither MySQL nor the ORM converts values. Conversion to local time happens only in the frontend.
- **Why `DATETIME` and not `TIMESTAMP`.** `TIMESTAMP` converts values based on the connection's session time zone and cannot store dates after January 2038. `DATETIME` stores exactly what it is given, so the "always UTC" rule is explicit and lives in one place.
- **Primary keys.** Every table uses a surrogate key: `INT UNSIGNED AUTO_INCREMENT`, named `<entity>_id`. These keys carry no business meaning and never change.
- **Cross-service references.** A column such as `attendance.employee_id` is a plain integer, not a foreign key. MySQL would allow a foreign key across databases on the same server, but that would couple services at the database level.
- **Naming.** Tables and columns use `snake_case`. Timestamps end in `_at`, booleans start with `is_`, and references end in `_id`.
- **Character set.** All databases use `utf8mb4` with collation `utf8mb4_0900_ai_ci`. This supports every character in names, and it makes text comparisons case-insensitive.
- **Audit columns.** Mutable tables have `created_at` and `updated_at`.

```sql
CREATE DATABASE auth_db       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE employee_db   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

The SQL below is the design specification. The actual tables will be created through the ORM's entities and migrations, which should produce an equivalent result.

## auth_db.credentials

```sql
CREATE TABLE credentials (
  credential_id  INT UNSIGNED                   NOT NULL AUTO_INCREMENT,
  employee_id    INT UNSIGNED                   NOT NULL,
  username       VARCHAR(50)                    NOT NULL,
  password_hash  VARCHAR(255)                   NOT NULL,
  role           ENUM('EMPLOYEE', 'HRD_ADMIN')  NOT NULL DEFAULT 'EMPLOYEE',
  is_active      BOOLEAN                        NOT NULL DEFAULT TRUE,
  created_at     DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (credential_id),
  UNIQUE KEY uq_credentials_username (username),
  UNIQUE KEY uq_credentials_employee (employee_id)
);
```
Notes:
- `credential_id` is an auto-increment integer. An integer is just as meaningless as a random string, and it is simpler. UUIDs are listed under future improvements.
- `employee_id` is `NOT NULL` and unique. Every credential belongs to exactly one employee, HRD admins included, and an employee has at most one credential.
- `username` allows up to 50 characters. Because the collation is case-insensitive, `Budi` and `budi` count as the same username, which is the desired behavior.
- `password_hash` stores a bcrypt hash. Bcrypt produces 60 characters; `VARCHAR(255)` leaves room to switch to argon2. Plain passwords are never stored.
- `role` is an `ENUM`, so the database rejects anything other than the two valid values.

## employee_db.employees

```sql
CREATE TABLE employees (
  employee_id        INT UNSIGNED                 NOT NULL AUTO_INCREMENT,
  name               VARCHAR(100)                 NOT NULL,
  email              VARCHAR(255)                 NOT NULL,
  department         VARCHAR(100)                 NOT NULL,
  position           VARCHAR(100)                 NOT NULL,
  employment_status  ENUM('ACTIVE', 'INACTIVE')   NOT NULL DEFAULT 'ACTIVE',
  created_at         DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employees_email (email)
);
```

Notes:
- `employment_status` records whether the person still works at the company. Employees are never deleted, because their attendance history must remain linked to a valid record.

## attendance_db.attendance

```sql
CREATE TABLE attendance (
  record_id      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  employee_id    INT UNSIGNED  NOT NULL,
  checked_in_at  DATETIME      NOT NULL,
  work_date      DATE          NOT NULL,
  photo_path     VARCHAR(255)  NOT NULL,
  PRIMARY KEY (record_id),
  UNIQUE KEY uq_attendance_employee_day (employee_id, work_date)
);
```

Decisions:

- `checked_in_at` is set by the server at the moment of check-in, never by the client, in UTC.
- `work_date` is the calendar date of `checked_in_at` in the business time zone (Asia/Jakarta, WIB). The server computes it once, at check-in. It is deliberately derived data: it records which day a check-in counts for, and it makes the uniqueness rule possible.
- `UNIQUE (employee_id, work_date)` enforces one check-in per employee per day in the database, so even two simultaneous requests cannot both succeed.
- `photo_path` stores a path relative to the upload directory, not an absolute path, so the files can move without changing the data.
- There are no `created_at` or `updated_at` columns. Attendance records are immutable (HRD has view-only access), so `updated_at` would never change, and `checked_in_at` already records when the row was created.

## Cross-service rules
 
The frontend always sends one request to the gateway. When an operation involves more than one service, the gateway orchestrates the internal calls.
 
- **Creating an employee (compensating action).** The gateway first validates everything it can, including whether the username and email are free. It then creates the employee record, then the credential. If creating the credential fails, the gateway deletes the employee record it just created and returns a single error, so HRD can retry cleanly. This internal delete is not part of the external API, which has no delete endpoint. If the compensating delete itself fails, the failure is logged.
- **Deactivating an employee (fail closed).** The gateway first sets `is_active = FALSE` in the auth service, then sets `employment_status = 'INACTIVE'` in the employee service. If the second step fails, access stays revoked and HRD gets an error to retry. Access is never re-enabled as compensation. Both steps are idempotent, so retrying is safe. Attendance records are kept unchanged.
- **Showing names with attendance (API composition).** The attendance service stores only `employee_id`. For HRD's attendance view, the gateway fetches the records, fetches the matching employees from the employee service, and merges them into one response.
- **Graceful degradation.** If the employee service fails or does not respond within 2 seconds, the gateway still returns the attendance records with `"employee": null` and a top-level warning. The status stays `200`.
- **Filtering attendance by department.** The gateway first asks the employee service for the IDs of employees in that department, then queries the attendance service for those IDs.
## API contract (external, frontend to gateway)
 
All paths are relative to the gateway. Every endpoint except login requires `Authorization: Bearer <token>`. JSON fields and query parameters use camelCase. Database columns use snake_case.
 
Errors use a single shape everywhere:
 
```json
{ "statusCode": 409, "message": "Already checked in today" }
```
 
Lists use a single shape everywhere:
 
```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```
 
### Auth
 
```
POST /auth/login                     public
  Body:  { "username", "password" }
  200 →  { "accessToken", "expiresIn", "employeeId", "role" }
  401 →  "Invalid username or password" (same message for every failure,
         to prevent user enumeration; also returned for deactivated accounts)
```
 
### Employees (HRD_ADMIN only)
 
```
GET   /employees?search=&department=&status=&page=&pageSize=
  200 →  list of employees
 
GET   /employees/:id
  200 →  one employee
  404 →  no such employee
 
POST  /employees
  Body:  { "name", "email", "department", "position", "username", "password" }
  201 →  the created employee (never the password or its hash)
  400 →  invalid or missing fields
  409 →  email or username already taken
 
PATCH /employees/:id
  Body:  any subset of { "name", "email", "department", "position", "employmentStatus" }
  200 →  the updated employee
  400 →  invalid fields
  404 →  no such employee
  409 →  email already taken
```
 
### Attendance
 
```
POST  /attendance-records                     EMPLOYEE
  Body:  multipart/form-data, field "photo" (JPEG or PNG, max 5 MB)
  Server derives: employee_id (token), checked_in_at (server clock, UTC),
                  work_date (checked_in_at in WIB), photo storage path
  201 →  { "recordId", "checkedInAt", "workDate", "photoUrl" }
  400 →  missing photo or wrong file type
  403 →  caller is not allowed to check in
  409 →  already checked in for this work_date
  413 →  photo too large
 
GET   /me/attendance-records/today            EMPLOYEE
  200 →  today's record
  404 →  not checked in today
 
GET   /attendance-records?employeeId=&department=&from=&to=&page=&pageSize=   HRD_ADMIN
  from and to are dates (inclusive), interpreted as work dates
  200 →  list of records, each with an "employee" object
         ({ "employeeId", "name", "department" }, or null if unavailable)
 
GET   /attendance-records/:id/photo           HRD_ADMIN
  200 →  the image file
  404 →  no such record
```
 
Every endpoint can also return `401` for a missing or invalid token and `403` for a role that is not allowed.
 
## Security notes
 
- Passwords are hashed with bcrypt and never returned by any endpoint.
- Access tokens expire after 1 hour. Known limitation: a token issued before deactivation stays valid until it expires. The full fix would be for the gateway to check `is_active` on every request.
- The client never supplies identity, timestamps, dates, or file paths. The server derives all of them.
## Open items
 
- Browsers do not send the `Authorization` header for a plain `<img src="...">`, so the photo endpoint needs a decision on how the frontend loads images. To be settled when building the frontend.
## Assumptions
 
- "Today" for attendance purposes is defined by WIB (UTC+7), the company's headquarters time zone.
- Times in the frontend are displayed in the viewer's browser time zone.
- HRD admins are employees and have records in the `employees` table.
- Each employee has one login with one role. HRD_ADMIN accounts are for administration and do not check in.
- One check-in per employee per day. The brief does not require check-out.
- Employees cannot view their attendance history, only today's status. The brief does not require history.
## Future improvements
 
- A `departments` table, so free-text values such as "IT" and "I.T." cannot both exist.
- UUIDs as primary keys, so IDs can be generated anywhere and cannot be guessed by counting.
- Support for employees in WITA and WIT, with `work_date` computed in each employee's own time zone.
- Rate limiting on login, to slow down password-guessing attacks.
- Keeping a local copy of employee names in the attendance service, if read volume ever made API composition too slow. The cost is eventual consistency.
 
