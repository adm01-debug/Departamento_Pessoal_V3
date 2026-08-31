
SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

CREATE ROLE "dp_mcp_role";
ALTER ROLE "dp_mcp_role" WITH NOINHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOBYPASSRLS;
CREATE ROLE "dp_mcp_user";
ALTER ROLE "dp_mcp_user" WITH INHERIT NOCREATEROLE NOCREATEDB LOGIN NOBYPASSRLS CONNECTION LIMIT 5;

ALTER ROLE "anon" SET "statement_timeout" TO '3s';

ALTER ROLE "authenticated" SET "statement_timeout" TO '8s';

ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';

GRANT "dp_mcp_role" TO "dp_mcp_user" WITH INHERIT TRUE GRANTED BY "postgres";

RESET ALL;
