-- Runs once when the local Docker database is first created.
-- DEVELOPMENT ONLY: production passwords come from a secret store, never from git.

-- Restricted role the app connects as (row-level security applies to it).
CREATE ROLE skool_app LOGIN PASSWORD 'skool_app_dev_password';

-- Separate database for automated tests, which may be wiped at any time.
CREATE DATABASE skool_test OWNER skool;
