-- Run once in Neon SQL Editor before deploying the new code.
-- Keeps all existing accounts, password hashes and learning records.
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS email_verified_at BIGINT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_sessions ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS email_action_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES email_accounts(user_id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 expires_at BIGINT NOT NULL,
 created_at BIGINT NOT NULL,
 auth_version INTEGER NOT NULL,
 UNIQUE(user_id,purpose)
);
CREATE INDEX IF NOT EXISTS email_action_tokens_expiry ON email_action_tokens(expires_at);
