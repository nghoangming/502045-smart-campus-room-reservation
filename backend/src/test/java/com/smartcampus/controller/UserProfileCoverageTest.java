package com.smartcampus.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartcampus.auth.AccessService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserProfileCoverageTest {
    @Mock JdbcTemplate jdbc;
    @Mock AccessService access;
    UserProfileController controller;
    @BeforeEach void setUp() { controller = new UserProfileController(jdbc, access); }

    @Test void filtersAdminUsersByFaculty() {
        when(jdbc.query(contains("FROM users u JOIN user_roles"), org.mockito.ArgumentMatchers.<RowMapper<UserProfileController.AdminUser>>any(), any(Object[].class)))
                .thenReturn(List.of());
        assertEquals(List.of(), controller.users(1L, null));
        assertEquals(List.of(), controller.users(1L, "IT"));
        verify(jdbc).query(contains("WHERE u.faculty = ?"), org.mockito.ArgumentMatchers.<RowMapper<UserProfileController.AdminUser>>any(), eq("IT"));
    }

    @Test void facultyUpdateRequiresExistingUserAndKnownFaculty() {
        when(jdbc.query(contains("SELECT user_code"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(3L)))
                .thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.setFaculty(3L, 1L, new UserProfileController.UpdateFaculty("IT"))).getStatusCode());
        when(jdbc.query(contains("SELECT user_code"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(3L)))
                .thenReturn(List.of("SA2500001"));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.setFaculty(3L, 1L, new UserProfileController.UpdateFaculty("UNKNOWN"))).getStatusCode());
        when(jdbc.query(contains("FROM faculties"), org.mockito.ArgumentMatchers.<RowMapper<String[]>>any(), any(), any()))
                .thenReturn(java.util.Collections.singletonList(new String[] {"B", "Other"}));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> controller.setFaculty(3L, 1L, new UserProfileController.UpdateFaculty("B"))).getStatusCode());
    }

    @Test void profileUpdateRejectsInvalidYearPhoneAndStudentCodeMismatch() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.update(3L, new UserProfileController.UpdateProfile("Name", null, null, null, 1800))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.update(3L, new UserProfileController.UpdateProfile("Name", null, "abc", null, null))).getStatusCode());
        when(access.hasRole(3L, "STUDENT")).thenReturn(true);
        when(jdbc.queryForObject(contains("SELECT user_code"), eq(String.class), eq(3L))).thenReturn("SA2500001");
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> controller.update(3L, new UserProfileController.UpdateProfile("Name", null, null, null, 2024))).getStatusCode());
    }

    @Test void changingPasswordNeedsOldPasswordAndDifferentNewPassword() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.changePassword(3L, new UserProfileController.ChangePassword("wrong", "newpassword"))).getStatusCode());
        when(jdbc.query(contains("SELECT password_hash"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(3L)))
                .thenReturn(List.of(new BCryptPasswordEncoder().encode("oldpassword")));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.changePassword(3L, new UserProfileController.ChangePassword("oldpassword", "oldpassword"))).getStatusCode());
        controller.changePassword(3L, new UserProfileController.ChangePassword("oldpassword", "newpassword"));
        verify(jdbc).update(contains("auth_version=auth_version+1"), anyString(), eq(3L));
    }

    @Test void missingPublicTeacherAndProfileReturn404() {
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.publicTeacher(7L)).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.me(7L)).getStatusCode());
    }
}
