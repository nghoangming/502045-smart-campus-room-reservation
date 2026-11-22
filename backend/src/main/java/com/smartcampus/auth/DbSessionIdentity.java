package com.smartcampus.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Sets the authenticated actor for database workflows within the current transaction. */
public final class DbSessionIdentity {
    private DbSessionIdentity() { }

    public static void set(JdbcTemplate jdbc, Long userId, String role) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Database identity requires an active transaction");
        }
        jdbc.queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, userId.toString());
        jdbc.queryForObject("SELECT set_config('app.role', ?, true)", String.class, role);
    }
}
