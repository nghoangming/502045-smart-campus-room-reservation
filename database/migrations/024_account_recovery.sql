BEGIN;

ALTER TABLE users
  ADD COLUMN personal_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;

-- Existing students who activated through the same personal address have proved ownership.
UPDATE users u SET personal_email_verified = TRUE
FROM student_intake s
WHERE s.user_id = u.user_id AND u.email_verified = TRUE
  AND lower(u.personal_email) = lower(s.personal_email);

CREATE TABLE account_action_tokens (
  token_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('EMAIL_CHANGE', 'PASSWORD_RESET')),
  target_email VARCHAR(100),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_action_target CHECK (purpose <> 'EMAIL_CHANGE' OR target_email IS NOT NULL)
);
CREATE INDEX idx_account_action_user_purpose ON account_action_tokens(user_id, purpose);

COMMIT;
