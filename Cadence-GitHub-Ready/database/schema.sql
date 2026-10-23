-- Run once in your Neon project's SQL Editor before enabling accounts.
-- Only table definitions; no user records or credentials are included.
CREATE TABLE IF NOT EXISTS email_accounts (
 user_id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at BIGINT NOT NULL,
 email_verified_at BIGINT,auth_version INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS email_sessions (
 token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES email_accounts(user_id) ON DELETE CASCADE,
 expires_at BIGINT NOT NULL,auth_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS email_sessions_expiry ON email_sessions(expires_at);
CREATE TABLE IF NOT EXISTS email_attempts (
 email TEXT PRIMARY KEY, window_start BIGINT NOT NULL, attempt_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS learning_records (
 user_id TEXT NOT NULL REFERENCES email_accounts(user_id) ON DELETE CASCADE,
 record_key TEXT NOT NULL, record_value TEXT NOT NULL, updated_at BIGINT NOT NULL,
 PRIMARY KEY(user_id,record_key)
);
CREATE TABLE IF NOT EXISTS email_action_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES email_accounts(user_id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires_at BIGINT NOT NULL,created_at BIGINT NOT NULL,auth_version INTEGER NOT NULL,
 UNIQUE(user_id,purpose)
);
CREATE INDEX IF NOT EXISTS email_action_tokens_expiry ON email_action_tokens(expires_at);
