-- Blockmind Labs — PostgreSQL schema
--
-- The repo previously contained no schema at all, so the `user_preferences`
-- table that src/preferences.py queries had never existed and every request
-- touching it failed with UndefinedTableError. Statements are idempotent so
-- this can be applied on every boot.

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id        TEXT PRIMARY KEY,
    wallet_address TEXT,
    default_chain  BIGINT       NOT NULL DEFAULT 91342,
    risk_tolerance TEXT         NOT NULL DEFAULT 'moderate',
    tx_summary     TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_wallet
    ON user_preferences (wallet_address);

-- ✅ COMPLIES WITH: AGENTS.md §9, §12.6
-- ✅ SERVICE: memory-service
