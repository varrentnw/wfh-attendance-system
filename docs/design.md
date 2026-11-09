# Design

## Overview

The backend is split into three services, each owning its own data, behind a single API gateway.

- **Gateway** is the only application exposed over HTTP (port 3000). It authenticates every request, checks roles, validates input, orchestrates operations that span services, and combines responses. It owns no data and has no database connection.
- **Auth service** owns login credentials and access rights.
- **Employee service** owns employee master data and employment status.
- **Attendance service** owns attendance records and uploaded photos.

The services communicate with the gateway over NestJS's TCP transport (auth on 4001, employee on 4002, attendance on 4003) and are not reachable from outside. The gateway is the trust boundary: it verifies the caller's identity, and the services trust the identity it passes in each message.

All three databases run on one MySQL instance. Each service connects only to its own database, using its own MySQL user that has privileges on that database alone. Ownership is therefore enforced twice: in code, and by the database server, which rejects any attempt by one service to read another's data.

## Conventions

- **Time.** All `DATETIME` values are stored in UTC. Every database connection is configured with the time zone `'Z'` (UTC), so neither MySQL nor the ORM converts values. Conversion to local time happens only in the frontend.
- **Why `DATETIME` and not `TIMESTAMP`.** `TIMESTAMP` converts values based on the connection's session time zone and cannot store dates after January 2038. `DATETIME` stores exactly what it is given, so the "always UTC" rule is explicit and lives in one place.
- **Primary keys.** Every table uses a surrogate key: `INT UNSIGNED AUTO_INCREMENT`, named `<entity>_id`. These keys carry no business meaning and never change.
- **Cross-service references.** A column such as `attendance.employee_id` is a plain integer, not a foreign key. MySQL would allow a foreign key across databases on the same server, but that would couple services at the database level.
- **Naming.** Tables and columns use `snake_case`. Timestamps end in `_at`, booleans start with `is_`, and references end in `_id`. Code, JSON fields, and query parameters use camelCase, and entities map between the two with explicit column names. One concept keeps one name at every layer (for example `employment_status` / `employmentStatus`).
- **Character set.** All databases use `utf8mb4` with collation `utf8mb4_0900_ai_ci`. This supports every character in names, and it makes text comparisons case-insensitive.
- **Audit columns.** Mutable tables have `created_at` and `updated_at`. They use `DATETIME(6)`, TypeORM's default microsecond precision for these columns.

```sql
CREATE DATABASE auth_db       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE employee_db   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

The databases and the per-service users are created by `docker/mysql/init.sql` on the first start of the MySQL container. The SQL below documents the resulting tables. In development, the tables are created from the TypeORM entities with `synchronize`, which is enabled only when `NODE_ENV=development`. Production would use reviewed migrations instead.

## auth_db.credentials

```sql
CREATE TABLE credentials (
  credential_id  INT UNSIGNED                   NOT NULL AUTO_INCREMENT,
  employee_id    INT UNSIGNED                   NOT NULL,
  username       VARCHAR(50)                    NOT NULL,
  password_hash  VARCHAR(255)                   NOT NULL,
  role           ENUM('EMPLOYEE', 'HRD_ADMIN')  NOT NULL DEFAULT 'EMPLOYEE',
  is_active      BOOLEAN                        NOT NULL DEFAULT TRUE,
  created_at     DATETIME(6)                    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at     DATETIME(6)                    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (credential_id),
  UNIQUE KEY uq_credentials_username (username),
  UNIQUE KEY uq_credentials_employee (employee_id)
);
```

Notes:

- `credential_id` is an auto-increment integer. An integer is just as meaningless as a random string, and it is simpler. UUIDs are listed under future improvements.
- `employee_id` is `NOT NULL` and unique. Every credential belongs to exactly one employee, HRD admins included, and an employee has at most one credential.
- `username` allows up to 50 characters. Because the collation is case-insensitive, `Budi` and `budi` count as the same username, which is the desired behavior.
- `password_hash` stores a bcrypt hash with cost factor 12. Bcrypt produces 60 characters; `VARCHAR(255)` leaves room to switch to argon2. Plain passwords are never stored. The entity marks this column `select: false`, so ordinary queries never load it; only login asks for it explicitly.
- `role` is an `ENUM`, so the database rejects anything other than the two valid values.
- `is_active` controls access only. Whether the person still works at the company is an employment fact, owned by the employee service.

## employee_db.employees

```sql
CREATE TABLE employees (
  employee_id        INT UNSIGNED                 NOT NULL AUTO_INCREMENT,
  name               VARCHAR(100)                 NOT NULL,
  email              VARCHAR(255)                 NOT NULL,
  department         VARCHAR(100)                 NOT NULL,
  position           VARCHAR(100)                 NOT NULL,
  employment_status  ENUM('ACTIVE', 'INACTIVE')   NOT NULL DEFAULT 'ACTIVE',
  created_at         DATETIME(6)                  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at         DATETIME(6)                  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employees_email (email)
);
```

Notes:

- Only data the requirements need is stored. Date of birth was deliberately left out (data minimization, in line with UU PDP).
- `email` is unique and sized to the 254-character standard maximum. `name` allows 100 characters, because long Indonesian names can exceed 30.
- `employment_status` records whether the person still works at the company. Employees are never deleted through the API, because their attendance history must remain linked to a valid record. The only delete is the gateway's internal compensation step (see cross-service rules).

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

Notes:

- `checked_in_at` is set by the server at the moment of check-in, never by the client, in UTC.
- `work_date` is the calendar date of `checked_in_at` in the business time zone (Asia/Jakarta, WIB). The server computes it once, at check-in, using the named time zone through `Intl.DateTimeFormat`, not hand-written offset arithmetic. It is deliberately derived data: it records which day a check-in counts for, and it makes the uniqueness rule possible.
- `UNIQUE (employee_id, work_date)` enforces one check-in per employee per day in the database, so even two simultaneous requests cannot both succeed. The service translates the violation into a `409`.
- No separate index on `employee_id` is needed. MySQL can use the leftmost column of the composite unique index for queries filtered by `employee_id` alone.
- `photo_path` is a server-generated path relative to the upload directory (`ATTENDANCE_UPLOAD_DIR`), in the form `<work_date>/<uuid>.<jpg|png>`. Files can move without changing the data, and the client never influences the path. The upload directory is excluded from Git.
- Check-in inserts the row **before** writing the photo. The most common failure, a duplicate check-in, is then rejected by the constraint before any file exists, so no orphaned photos are left behind. If writing the file fails, the row is deleted and the error is returned.
- There are no `created_at` or `updated_at` columns. Attendance records are immutable (HRD has view-only access), so `updated_at` would never change, and `checked_in_at` already records when the row was created.

## Internal contract (gateway to services)

Every message the gateway sends, and every type it carries, is defined once in the shared library `libs/common` and imported by both sides, so a mismatch is a compile error. The library holds only contracts: message pattern names, payload and view interfaces, and the shared enums `Role` and `EmploymentStatus`. It never holds entities or logic used by a single service.

Rules:

- Payloads are always objects, never bare values, so they can gain fields without breaking existing callers.
- Every request-response handler returns a value. A handler that returns nothing makes the gateway's call fail.
- A service reports a known failure by throwing `RpcException({ statusCode, message })`. Exceptions cannot cross a process boundary, so the error travels as data; the gateway's global exception filter turns it back into the matching HTTP response. Any other error becomes a generic `500`, logged at the gateway with its details, which are never sent to the client.
- Dates travel as ISO 8601 strings, because only JSON data crosses TCP.

Auth service:

```
auth.login              LoginPayload            → LoginResult              (401 on any failure)
auth.create_credential  CreateCredentialPayload → CredentialView           (409 duplicate username or employee)
auth.username_exists    { username }            → boolean
auth.set_active         SetActivePayload        → { employeeId, isActive }
```

Employee service:

```
employee.find_all       FindEmployeesPayload    → PaginatedResult<EmployeeView>
employee.find_one       { employeeId }          → EmployeeView             (404 if missing)
employee.find_by_ids    { employeeIds }         → EmployeeView[]           (missing IDs are simply omitted)
employee.create         CreateEmployeePayload   → EmployeeView             (409 duplicate email)
employee.update         { employeeId, changes } → EmployeeView             (404, 409)
employee.remove         { employeeId }          → { employeeId }           (internal compensation only)
```

`find_one` and `find_by_ids` stay separate on purpose: a missing employee is an error for the first and a normal outcome for the second.

Attendance service:

```
attendance.check_in     CheckInPayload          → AttendanceRecordView     (409 already checked in)
attendance.find_today   { employeeId }          → AttendanceRecordView     (404 if none)
attendance.find_all     FindAttendancePayload   → PaginatedResult<AttendanceRecordView>
attendance.find_photo   { recordId }            → PhotoResult              (404 if missing)
```

## Cross-service rules

The frontend always sends one request to the gateway. When an operation involves more than one service, the gateway orchestrates the internal calls in its own service layer, keeping its controllers thin.

- **Creating an employee (compensating action).** The gateway first asks the auth service whether the username is taken, and rejects the request with `409` before anything is written. It then creates the employee record; a duplicate email fails here with `409`, again before anything needs undoing. Finally it creates the credential with the `EMPLOYEE` role. If creating the credential fails, the gateway removes the employee record it just created and returns the original error, so HRD sees the real cause and can retry cleanly. If the removal itself fails, the gateway logs the `employeeId` for manual cleanup and still returns the original error. The password is sent only to the auth service and is never returned.
- **Deactivating an employee (fail closed).** The gateway first sets `is_active = FALSE` in the auth service, then sets `employment_status = 'INACTIVE'` in the employee service. If the second step fails, access stays revoked and HRD gets an error to retry. Access is never re-enabled as compensation. Both steps are idempotent, so retrying is safe. Attendance records are kept unchanged.
- **Reactivating an employee (fail closed, reverse order).** The gateway first sets `employment_status = 'ACTIVE'`, then re-enables the login. If the second step fails, the person is marked active but cannot log in yet, which is the safe failure, and a retry completes it.
- **Showing names with attendance (API composition).** The attendance service stores only `employee_id`. For HRD's attendance view, the gateway fetches a page of records, collects the distinct employee IDs, fetches those employees in one `employee.find_by_ids` call, and merges them into one response.
- **Graceful degradation.** If the employee service fails or does not respond within 2 seconds, the gateway still returns the attendance records, with `"employee": null` on each, and logs a warning. The status stays `200`.
- **Photo transfer.** The gateway receives the upload, checks the file's type from its first bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`) rather than trusting the declared type, and sends the bytes to the attendance service as base64 inside the TCP message. The attendance service alone writes and reads the files. This costs about 33% overhead per photo, which is acceptable at this scale.

## API contract (external, frontend to gateway)

All paths are relative to the gateway. Every endpoint except login requires `Authorization: Bearer <token>`. JSON fields and query parameters use camelCase.

Errors use a single shape everywhere:

```json
{ "statusCode": 409, "message": "Already checked in today" }
```

Validation errors (`400`) return `message` as an array of strings, listing every failure at once; all other errors return a single string. Errors raised by NestJS itself may also include an `error` field with the status name.

Lists use a single shape everywhere:

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```

`page` defaults to 1, and `pageSize` defaults to 20 with a maximum of 100. Request bodies may contain only declared fields; any other field is rejected with `400`.

Every endpoint can also return `401` for a missing or invalid token and `403` for a role that is not allowed.

### Auth

```
POST /auth/login                     public
  Body:  { "username", "password" }
  200 →  { "accessToken", "expiresIn", "employeeId", "role" }
  400 →  missing fields, or a password longer than 72 characters
  401 →  "Invalid username or password" (same message for every failure,
         to prevent user enumeration; also returned for deactivated accounts)
```

### Employees (HRD_ADMIN only)

```
GET   /employees?search=&department=&employmentStatus=&page=&pageSize=
  search matches name or email; department and employmentStatus match exactly
  200 →  list of employees, ordered by name

GET   /employees/:id
  200 →  one employee
  400 →  id is not a number
  404 →  no such employee

POST  /employees
  Body:  { "name", "email", "department", "position", "username", "password" }
         password: 8 to 72 characters
  201 →  the created employee, plus "username" and "role" (never the password or its hash)
  400 →  invalid or missing fields
  409 →  email or username already taken

PATCH /employees/:id
  Body:  any subset of { "name", "email", "department", "position", "employmentStatus" }
         changing employmentStatus also disables or re-enables the login
  200 →  the updated employee
  400 →  invalid fields
  404 →  no such employee
  409 →  email already taken
```

### Attendance

```
POST  /attendance-records                     EMPLOYEE
  Body:  multipart/form-data, exactly one file in field "photo" (JPEG or PNG, max 5 MB)
  Server derives: employee_id (token), checked_in_at (server clock, UTC),
                  work_date (checked_in_at in WIB), photo storage path
  201 →  { "recordId", "employeeId", "checkedInAt", "workDate", "photoUrl" }
  400 →  missing photo, more than one file, or content that is not a JPEG or PNG
  403 →  caller is not allowed to check in (HRD admins do not check in)
  409 →  already checked in for this work_date
  413 →  photo too large

GET   /me/attendance-records/today            EMPLOYEE
  The caller is identified by the token only; the path contains no IDs.
  200 →  today's record
  404 →  "Not checked in today" (the resource does not exist yet)

GET   /attendance-records?employeeId=&from=&to=&page=&pageSize=   HRD_ADMIN
  from and to are work dates in YYYY-MM-DD format, both inclusive
  200 →  list of records, newest first, each with an "employee" object
         ({ "employeeId", "name", "department" }, or null if unavailable)
  400 →  invalid query parameters

GET   /attendance-records/:id/photo           HRD_ADMIN
  200 →  the image bytes, with the matching Content-Type
  404 →  no such record
```

## Security notes

- **Secure by default.** The authentication and role guards are registered globally in the gateway. Every route requires a valid token unless it is explicitly marked public, so a forgotten annotation makes a route too strict, never unprotected.
- **Tokens.** JWTs are signed with `JWT_SECRET`, which lives only in the environment and is never committed. Only the auth service signs tokens; the gateway only verifies them. Tokens carry only `sub` (the employee ID) and `role`, because their contents are readable by anyone. They expire after 1 hour. Known limitation: a token issued before deactivation stays valid until it expires; the full fix would be for the gateway to check `is_active` on every request.
- **Passwords.** Hashed with bcrypt (cost 12) and never returned by any endpoint. Passwords are limited to 72 characters, because bcrypt ignores everything beyond 72 bytes. Known limitation: a login with an unknown username skips the hash comparison and responds measurably faster, which could reveal which usernames exist.
- **Input.** All input is validated at the gateway. Undeclared fields are rejected, preventing mass assignment. The client never supplies identity, timestamps, dates, or file paths; the server derives all of them. Uploaded files are checked by content, not by their declared type.
- **Least privilege.** Each service's MySQL user has privileges on its own database only. Credentials and password hashes are handled only by the auth service.
- **Error details.** Unexpected errors are logged on the server and reported to the client only as a generic `500`, so database and internal details never leak.
- **Development secrets.** The database passwords in `init.sql` are for local development only. Production would use a secrets manager.

## Open items

- Browsers do not send the `Authorization` header for a plain `<img src="...">`, so the photo endpoint needs a decision on how the frontend loads images. To be settled when building the frontend.

## Assumptions

- "Today" for attendance purposes is defined by WIB (UTC+7), the company's headquarters time zone.
- Times in the frontend are displayed in the viewer's browser time zone.
- HRD admins are employees and have records in the `employees` table.
- Each employee has one login with one role. HRD_ADMIN accounts are for administration and do not check in.
- One check-in per employee per day. The brief does not require check-out.
- Employees cannot view their attendance history, only today's status. The brief does not require history.
- Employees created through the API always receive the EMPLOYEE role; HRD admin accounts are created by the seed script.

## Future improvements

- Filtering attendance by department. The gateway would ask the employee service for the IDs of employees in that department, then query the attendance service for those IDs.
- A `departments` table, so free-text values such as "IT" and "I.T." cannot both exist.
- Object storage for photos (for example S3), with the browser uploading directly through a pre-signed URL, so files no longer pass through the gateway and TCP.
- Reviewed migrations instead of `synchronize`, and two MySQL users per service: a restricted one for the running app and a privileged one used only for migrations.
- A periodic cleanup job for the rare inconsistencies compensation cannot cover, such as a crash between saving an attendance record and writing its photo.
- Retrying failed compensation automatically (for example with an outbox), instead of relying on logs and manual cleanup.
- A dummy hash comparison for unknown usernames, removing the login timing difference.
- Rate limiting on login, to slow down password-guessing attacks.
- Observability across services: correlated logs and distributed tracing, so one request can be followed through the gateway and every service it touches.
- Automated tests: unit tests for services and end-to-end tests for the API.
- UUIDs as primary keys, so IDs can be generated anywhere and cannot be guessed by counting.
- Support for employees in WITA and WIT, with `work_date` computed in each employee's own time zone.
- Keeping a local copy of employee names in the attendance service, if read volume ever made API composition too slow. The cost is eventual consistency.