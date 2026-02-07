-- Claude Agent Platform - Database Initialization
-- Create main database and extensions

-- Create main database
CREATE DATABASE claude_agent;

-- Connect to the main database
\c claude_agent;

-- Create required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS agents;
CREATE SCHEMA IF NOT EXISTS monitoring;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path
ALTER DATABASE claude_agent SET search_path TO platform, agents, auth, monitoring, audit, public;

-- Grant permissions
GRANT ALL ON SCHEMA auth TO claude_user;
GRANT ALL ON SCHEMA platform TO claude_user;
GRANT ALL ON SCHEMA agents TO claude_user;
GRANT ALL ON SCHEMA monitoring TO claude_user;
GRANT ALL ON SCHEMA audit TO claude_user;

-- Enable Row Level Security
ALTER DATABASE claude_agent SET row_security = on;
