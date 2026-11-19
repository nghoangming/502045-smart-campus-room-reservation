package com.smartcampus.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartcampus.auth.AccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class LookupAndNotificationControllerTest {
    @Mock JdbcTemplate jdbc;

    @Test
    void nonAdminCannotReadAnotherUsersFullProfile() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(10L), eq("ADMIN"))).thenReturn(0);
        UserProfileController controller = new UserProfileController(jdbc, new AccessService(jdbc));

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> controller.getUser(20L, 10L)).getStatusCode());
    }

    @Test
    void markAllReadIsScopedToCurrentUserAndIdempotent() {
        when(jdbc.update(anyString(), eq(10L))).thenReturn(2, 0);
        NotificationController controller = new NotificationController(jdbc);

        assertEquals(2, controller.markAllRead(10L).updatedCount());
        assertEquals(0, controller.markAllRead(10L).updatedCount());
        verify(jdbc, org.mockito.Mockito.times(2)).update(
                org.mockito.ArgumentMatchers.contains("WHERE user_id=? AND is_read=FALSE"), eq(10L));
    }
}
