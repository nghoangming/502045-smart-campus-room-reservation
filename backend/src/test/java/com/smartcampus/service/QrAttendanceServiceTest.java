package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartcampus.controller.QrAttendanceController.CheckInRequest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.sql.ResultSet;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class QrAttendanceServiceTest {
    private static final long SESSION_ID = 20L;
    private static final long TEACHER_ID = 10L;
    private static final long STUDENT_ID = 11L;
    private static final long BOOKING_ID = 30L;
    private static final long SEAT_ID = 40L;
    private static final String QR = "AB234";

    @Mock JdbcTemplate jdbc;
    private QrAttendanceService service;

    @BeforeEach
    void setUp() { service = new QrAttendanceService(jdbc); }

    private void role(long userId, String name) {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(userId), eq(name))).thenReturn(1);
    }

    private void session(OffsetDateTime start, OffsetDateTime end, String status) {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID))).thenAnswer(invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            ResultSet row = org.mockito.Mockito.mock(ResultSet.class);
            when(row.getLong(1)).thenReturn(SESSION_ID);
            when(row.getLong(2)).thenReturn(BOOKING_ID);
            when(row.getLong(3)).thenReturn(TEACHER_ID);
            when(row.getObject(4, OffsetDateTime.class)).thenReturn(start);
            when(row.getObject(5, OffsetDateTime.class)).thenReturn(end);
            when(row.getString(6)).thenReturn(status);
            return List.of(mapper.mapRow(row, 0));
        });
    }

    private void validWindow() {
        OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(8);
        session(start, start.plusHours(1), "CONFIRMED");
    }

    @Test
    void generatesShortLivedQrOnlyForTheOwningTeacher() {
        role(TEACHER_ID, "TEACHER");
        validWindow();
        when(jdbc.queryForObject(anyString(), eq(Integer.class), anyString())).thenReturn(0);

        var result = service.generate(SESSION_ID, TEACHER_ID);

        assertEquals(SESSION_ID, result.classSessionId());
        assertEquals(5, result.token().length());
        assertNotNull(result.expiresAt());
        verify(jdbc).update(anyString(), eq(SESSION_ID));
        verify(jdbc).update(anyString(), eq(SESSION_ID), anyString(), any(OffsetDateTime.class), eq(TEACHER_ID));
    }

    @Test
    void rejectsQrGenerationByAnotherTeacher() {
        role(99L, "TEACHER");
        session(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(8),
                OffsetDateTime.now(ZoneOffset.UTC).plusHours(1), "CONFIRMED");

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.generate(SESSION_ID, 99L)).getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsQrBeforeTheCheckInWindowOrAfterItExpires() {
        role(TEACHER_ID, "TEACHER");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        session(now.minusMinutes(2), now.plusHours(1), "CONFIRMED");
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.generate(SESSION_ID, TEACHER_ID)).getStatusCode());

        session(now.minusMinutes(25), now.minusMinutes(4), "CONFIRMED");
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.generate(SESSION_ID, TEACHER_ID)).getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsCheckInWithInvalidQrOrQrForAnotherSession() {
        role(STUDENT_ID, "STUDENT");
        when(jdbc.query(anyString(), any(RowMapper.class), anyString()))
                .thenReturn(List.of());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest("bad", SESSION_ID), STUDENT_ID)).getStatusCode());

        when(jdbc.query(anyString(), any(RowMapper.class), anyString()))
                .thenReturn(List.of(SESSION_ID));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest(QR, 999L), STUDENT_ID)).getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsCheckInOutsideTheWindowWithoutCreatingAttendance() {
        role(STUDENT_ID, "STUDENT");
        when(jdbc.query(anyString(), any(RowMapper.class), anyString()))
                .thenReturn(List.of(SESSION_ID));
        OffsetDateTime start = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(2);
        session(start, start.plusHours(1), "CONFIRMED");

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest(QR, SESSION_ID), STUDENT_ID)).getStatusCode());
        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }

    @Test
    void createsAttendanceForStudentWithReservedSeat() {
        role(STUDENT_ID, "STUDENT");
        when(jdbc.query(anyString(), any(RowMapper.class), anyString())).thenReturn(List.of(SESSION_ID));
        validWindow();
        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID), eq(STUDENT_ID)))
                .thenAnswer(invocation -> List.of(new long[] { SEAT_ID, 8L }));
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(BOOKING_ID), eq(STUDENT_ID))).thenReturn(0);
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(BOOKING_ID), eq(STUDENT_ID))).thenReturn(51L);
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq(BOOKING_ID), eq(STUDENT_ID), eq(51L), any(OffsetDateTime.class)))
                .thenReturn(61L);

        var result = service.checkIn(new CheckInRequest(QR, SESSION_ID), STUDENT_ID);

        assertEquals(61L, result.id());
        assertEquals(SESSION_ID, result.classSessionId());
        assertEquals(STUDENT_ID, result.userId());
        assertEquals(SEAT_ID, result.seatId());
        assertEquals(8, result.seatNumber());
        assertEquals("PRESENT", result.status());
    }

    @Test
    void requiresReservedSeatAndRejectsDuplicateAttendance() {
        role(STUDENT_ID, "STUDENT");
        when(jdbc.query(anyString(), any(RowMapper.class), anyString())).thenReturn(List.of(SESSION_ID));
        validWindow();
        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID), eq(STUDENT_ID)))
                .thenReturn(List.of());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest(QR, SESSION_ID), STUDENT_ID)).getStatusCode());

        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID), eq(STUDENT_ID)))
                .thenReturn(List.of(new long[] { SEAT_ID, 8L }));
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(BOOKING_ID), eq(STUDENT_ID))).thenReturn(1);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.checkIn(new CheckInRequest(QR, SESSION_ID), STUDENT_ID)).getStatusCode());
        verify(jdbc, never()).queryForObject(anyString(), eq(Long.class), any(Object[].class));
    }
}
