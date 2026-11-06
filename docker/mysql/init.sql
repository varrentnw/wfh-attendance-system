-- ─── 1. Databases ──────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `auth_db`       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `employee_db`   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `attendance_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ─── 2. Users (one per service) ───────────────────────────────
CREATE USER IF NOT EXISTS 'auth_user'@'%'       IDENTIFIED BY 'auth_pass';
CREATE USER IF NOT EXISTS 'employee_user'@'%'   IDENTIFIED BY 'employee_pass';
CREATE USER IF NOT EXISTS 'attendance_user'@'%' IDENTIFIED BY 'attendance_pass';

-- ─── 3. Grants (each user → its own database only) ────────────
GRANT ALL PRIVILEGES ON `auth_db`.*       TO 'auth_user'@'%';
GRANT ALL PRIVILEGES ON `employee_db`.*   TO 'employee_user'@'%';
GRANT ALL PRIVILEGES ON `attendance_db`.* TO 'attendance_user'@'%';