-- Revoke all access from anon role on projects table
-- Projects require authentication; anon should have no access
REVOKE SELECT, INSERT, UPDATE, DELETE ON projects FROM anon;
