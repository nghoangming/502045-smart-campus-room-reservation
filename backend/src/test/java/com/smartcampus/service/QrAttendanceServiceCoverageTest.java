package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartcampus.controller.QrAttendanceController.CheckInRequest;
import com.smartcampus.controller.QrAttendanceController.CorrectionRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class QrAttendanceServiceCoverageTest {
    @Mock JdbcTemplate jdbc;
    QrAttendanceService service;
    @BeforeEach void setUp() {
        service = new QrAttendanceService(jdbc);
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }
    @AfterEach void tearDown() { TransactionSynchronizationManager.setActualTransactionActive(false); }

    @Test void rejectsCheckInWithoutPermissionOrSession() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest("CODE", 5L), 3L)).getStatusCode());
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(3L), eq("STUDENT"), eq("CHECK_IN_QR"))).thenReturn(1);
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest("CODE", null), 3L)).getStatusCode());
    }

    @Test void teacherMayOnlyListOwnSession() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(7L), eq("TEACHER"), eq("VIEW_ATTENDANCE"))).thenReturn(1);
        doReturn("7").when(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "7");
        doReturn("TEACHER").when(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "TEACHER");
        when(jdbc.queryForObject(contains("SELECT b.user_id"), eq(Long.class), eq(5L))).thenReturn(8L);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.list(5L, 7L)).getStatusCode());
    }

    @Test void missingAttendanceCannotBeCancelled() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM attendance WHERE attendance_id=?"), org.mockito.ArgumentMatchers.<RowMapper<long[]>>any(), eq(10L))).thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.cancel(10L, 7L)).getStatusCode());
    }

    @Test void teacherCanRevokeExistingCheckIn() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        doReturn("7").when(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "7");
        doReturn("TEACHER").when(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "TEACHER");
        when(jdbc.query(contains("FROM attendance WHERE attendance_id=?"), org.mockito.ArgumentMatchers.<RowMapper<long[]>>any(), eq(10L)))
                .thenReturn(java.util.Collections.singletonList(new long[] {5L, 3L}));
        service.cancel(10L, 7L);
        verify(jdbc).queryForObject("SELECT attendance_id FROM revoke_class_checkin(?,?,?)", Long.class, 5L, 3L, 7L);
    }

    @Test void correctionRejectsBlankReasonAndMissingAttendance() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.correct(10L, new CorrectionRequest("PRESENT", " "), 7L)).getStatusCode());
        when(jdbc.query(contains("FROM attendance WHERE attendance_id=?"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(10L))).thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.correct(10L, new CorrectionRequest("PRESENT", "Correction"), 7L)).getStatusCode());
    }

    @Test void finalizationRequiresExistingSession() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM class_sessions cs JOIN bookings b"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(5L))).thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.finalizeAttendance(5L, 7L)).getStatusCode());
    }
}
