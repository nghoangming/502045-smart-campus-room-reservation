package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doReturn;

import com.smartcampus.controller.QrAttendanceController.CorrectionRequest;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class QrAttendanceWorkflowTest {
    @Mock JdbcTemplate jdbc;
    private QrAttendanceService service;

    @BeforeEach
    void setUp() {
        service = new QrAttendanceService(jdbc);
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void teacherFinalizesThroughDatabaseWithTransactionIdentity() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM class_sessions cs JOIN bookings b"),
                org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(30L))).thenReturn(List.of(7L));
        doReturn("7").when(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "7");
        doReturn("TEACHER").when(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "TEACHER");
        doReturn(2).when(jdbc).queryForObject("SELECT finalize_class_attendance(?)", Integer.class, 30L);

        assertEquals(2, service.finalizeAttendance(30L, 7L));
        verify(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "7");
        verify(jdbc).queryForObject("SELECT set_config('app.role', ?, true)", String.class, "TEACHER");
    }

    @Test
    void lateCheckInCountsAsCheckedInForStudent() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(9L), eq("STUDENT"), eq("VIEW_OWN_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM own_attendance"),
                org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(9L)))
                .thenReturn(List.of(30L));

        assertEquals(List.of(30L), service.checkedInSessions(9L));
        verify(jdbc).query(contains("attendance_status IN ('PRESENT','LATE')"),
                org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(9L));
    }

    @Test
    void correctionRequiresValidStatusAndReason() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.correct(10L, new CorrectionRequest("INVALID", "reason"), 7L));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }

    @Test
    void correctionCallsDatabaseWorkflowAsAuthenticatedTeacher() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM attendance WHERE attendance_id=?"),
                org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(10L))).thenReturn(List.of(30L));

        service.correct(10L, new CorrectionRequest("EXCUSED", "Đã kiểm tra đơn vắng"), 7L);

        verify(jdbc).queryForObject("SELECT set_config('app.user_id', ?, true)", String.class, "7");
        verify(jdbc).queryForObject("SELECT attendance_id FROM correct_attendance(?,?,?)",
                Long.class, 10L, "EXCUSED", "Đã kiểm tra đơn vắng");
    }

    @Test
    void teacherCannotFinalizeAnotherTeachersSession() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L), eq("TEACHER"), eq("MANAGE_ATTENDANCE"))).thenReturn(1);
        when(jdbc.query(contains("FROM class_sessions cs JOIN bookings b"),
                org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(30L))).thenReturn(List.of(8L));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.finalizeAttendance(30L, 7L));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }
}
