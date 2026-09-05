-- Run this ONCE in MySQL Workbench, connected as root.
-- Creates the application database, a scratch database Prisma needs, and a
-- dedicated MySQL user for the application.
--
-- >>> Replace 'choose-a-strong-password' below with a password of your own. <<<

-- 1. The application database.
--    In MySQL, "database" and "schema" are the same thing.
--    utf8mb4 stores the full range of Unicode, including accents (é, ü) and emoji —
--    important because we handle Dutch, German and French product names.
CREATE DATABASE IF NOT EXISTS food_finder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Prisma's "shadow database": a scratch database Prisma creates tables in
--    during development, to verify a migration works before touching the real one.
--    We create it ourselves so the app user does not need server-wide permissions.
CREATE DATABASE IF NOT EXISTS food_finder_shadow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 3. A dedicated user for the application, so it never connects as root.
CREATE USER IF NOT EXISTS 'food_finder_app'@'localhost'
  IDENTIFIED BY 'choose-a-strong-password';

-- 4. Rights on those two databases only — nothing else on the server.
--    Migrations create and change tables, so CREATE/ALTER/DROP are required.
GRANT ALL PRIVILEGES ON food_finder.*        TO 'food_finder_app'@'localhost';
GRANT ALL PRIVILEGES ON food_finder_shadow.* TO 'food_finder_app'@'localhost';

FLUSH PRIVILEGES;

-- 5. Verify what we just made.
SHOW DATABASES LIKE 'food_finder%';
SELECT user, host FROM mysql.user WHERE user = 'food_finder_app';
SHOW GRANTS FOR 'food_finder_app'@'localhost';
