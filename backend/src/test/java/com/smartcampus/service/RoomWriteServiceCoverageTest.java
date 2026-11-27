package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartcampus.dto.RoomWriteRequest;
import com.smartcampus.dto.RoomResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class RoomWriteServiceCoverageTest {
    @Mock JdbcTemplate jdbc;
    RoomWriteService service;
    RoomWriteRequest room = new RoomWriteRequest("A901", "Test Lab", "Tower A", "ACTIVE", "LAB", 10);

    @BeforeEach void setUp() { service = new RoomWriteService(jdbc); }

    @Test void onlyAdminMayCreateRoom() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.create(room, 1L)).getStatusCode());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test void invalidRoomAttributesAreRejected() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        for (RoomWriteRequest invalid : List.of(
                new RoomWriteRequest("C901", "Study", "", "ACTIVE", "LAB", 1),
                new RoomWriteRequest("A901", "Lab", "", "BROKEN", "LAB", 1),
                new RoomWriteRequest("A901", null, "", "ACTIVE", "LAB", 1),
                new RoomWriteRequest("Z901", "Lab", "", "ACTIVE", "LAB", 1))) {
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                    () -> service.create(invalid, 1L)).getStatusCode());
        }
    }

    @Test void duplicateRoomCodeReturnsConflict() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.queryForObject(contains("INSERT INTO rooms"), eq(Long.class), any(Object[].class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.create(room, 1L)).getStatusCode());
    }

    @Test void roomMustExistForUpdate() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.query(contains("SELECT type FROM rooms"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(12L)))
                .thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.update(12L, room, 1L)).getStatusCode());
    }

    @Test void bookedRoomCannotChangeType() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.query(contains("SELECT type FROM rooms"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(12L)))
                .thenReturn(List.of("THEORY"));
        when(jdbc.queryForObject(contains("count(*) FROM bookings"), eq(Integer.class), eq(12L))).thenReturn(2);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.update(12L, room, 1L)).getStatusCode());
    }

    @Test void shrinkingSeatsWithHistoryReturnsConflict() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.query(contains("SELECT type FROM rooms"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(12L)))
                .thenReturn(List.of("LAB"));
        when(jdbc.queryForObject(contains("MAX(seat_number)"), eq(Integer.class), eq(12L))).thenReturn(20);
        when(jdbc.update(contains("DELETE FROM seats"), eq(12L), eq(10)))
                .thenThrow(new DataIntegrityViolationException("reserved"));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.update(12L, room, 1L)).getStatusCode());
    }

    @Test void createsRoomAndInitialSeats() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.queryForObject(contains("INSERT INTO rooms"), eq(Long.class), any(Object[].class))).thenReturn(12L);
        RoomResponse result = new RoomResponse(12L, "A901", "Test Lab", "Tower A", "ACTIVE", "LAB", 10);
        when(jdbc.queryForObject(contains("FROM rooms r WHERE r.room_id"), org.mockito.ArgumentMatchers.<RowMapper<RoomResponse>>any(), eq(12L))).thenReturn(result);
        assertEquals(result, service.create(room, 1L));
        verify(jdbc).update(contains("INSERT INTO seats"), eq(12L), eq(10));
    }

    @Test void expandsExistingRoomCapacity() {
        when(jdbc.queryForObject(contains("FROM user_roles"), eq(Integer.class), eq(1L))).thenReturn(1);
        when(jdbc.query(contains("SELECT type FROM rooms"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(12L)))
                .thenReturn(List.of("LAB"));
        when(jdbc.queryForObject(contains("MAX(seat_number)"), eq(Integer.class), eq(12L))).thenReturn(5);
        RoomResponse result = new RoomResponse(12L, "A901", "Test Lab", "Tower A", "ACTIVE", "LAB", 10);
        when(jdbc.queryForObject(contains("FROM rooms r WHERE r.room_id"), org.mockito.ArgumentMatchers.<RowMapper<RoomResponse>>any(), eq(12L))).thenReturn(result);
        assertEquals(result, service.update(12L, room, 1L));
        verify(jdbc).update(contains("generate_series(?, ?)"), eq(12L), eq(6), eq(10), eq(12L));
    }
}
