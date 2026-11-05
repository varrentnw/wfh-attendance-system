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

- When an employee leaves, HRD sets `employment_status` to `INACTIVE` in the employee service. The employee service must then tell the auth service to set `is_active = FALSE`. Their attendance records are kept unchanged.
- Adding a new employee requires two writes in two services: the employee record, then its credential. There is no shared transaction, so the design must handle the case where the second write fails. This will be addressed in the API design.
- The admin attendance view shows employee names, but the attendance service stores only `employee_id`. Some part of the system has to combine the two. This will be addressed in the API design.

## Assumptions

- "Today" for attendance purposes is defined by WIB (UTC+7), the company's headquarters time zone.
- Times in the frontend are displayed in the viewer's browser time zone.
- HRD admins are employees and have records in the `employees` table.
- One check-in per employee per day. The brief does not require check-out.

## Future improvements

- A `departments` table, so free-text values such as "IT" and "I.T." cannot both exist.
- UUIDs as primary keys, so IDs can be generated anywhere and cannot be guessed by counting.
- Support for employees in WITA and WIT, with `work_date` computed in each employee's own time zone.
