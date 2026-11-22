package com.smartcampus.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartcampus.auth.AccessService;
import com.smartcampus.service.RoomWriteService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RoomResourceDeletionTest {
    @Mock JdbcTemplate jdbc;
    @Mock AccessService access;

    @BeforeEach
    void beginTransaction() {
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }

    @AfterEach
    void endTransaction() {
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void adminDeletesRoomThroughGuardedDatabaseFunction() {
        when(jdbc.queryForObject(org.mockito.ArgumentMatchers.contains("r.role_name = 'ADMIN'"),
                org.mockito.ArgumentMatchers.eq(Integer.class), org.mockito.ArgumentMatchers.eq(5L))).thenReturn(1);

        new RoomWriteService(jdbc).delete(9L, 5L);

        verify(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "5");
        verify(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "ADMIN");
        verify(jdbc).queryForObject("SELECT 1 FROM delete_unused_room(?)", Integer.class, 9L);
    }

    @Test
    void nonAdminCannotDeleteRoom() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> new RoomWriteService(jdbc).delete(9L, 5L));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }

    @Test
    void adminDeletesResourceThroughGuardedDatabaseFunction() {
        new ResourceController(jdbc, access).delete(12L, 5L);

        verify(access).requireRole(5L, "ADMIN");
        verify(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "5");
        verify(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "ADMIN");
        verify(jdbc).queryForObject("SELECT 1 FROM delete_room_resource(?)", Integer.class, 12L);
    }
}
