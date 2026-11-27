package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartcampus.dto.ClassSessionRequest;
import com.smartcampus.entity.Booking;
import com.smartcampus.entity.Room;
import com.smartcampus.exception.ReservationConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.repository.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
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
class ClassSessionServiceCoverageTest {
    @Mock BookingRepository bookings;
    @Mock ClassSessionRepository sessions;
    @Mock RoomRepository rooms;
    @Mock SeatReservationRepository seats;
    @Mock JdbcTemplate jdbc;
    ClassSessionService service;
    ClassSessionRequest request = new ClassSessionRequest(8L, "IT001", "Algorithms");

    @BeforeEach void setUp() { service = new ClassSessionService(bookings, sessions, rooms, seats, jdbc); }

    @Test void rejectsMissingOrCancelledBooking() {
        assertThrows(ResourceNotFoundException.class, () -> service.create(request));
        Booking cancelled = mock(Booking.class);
        when(cancelled.getStatus()).thenReturn("CANCELLED");
        when(bookings.findByIdForUpdate(8L)).thenReturn(Optional.of(cancelled));
        assertThrows(IllegalArgumentException.class, () -> service.create(request));
    }

    @Test void rejectsMissingOrNonClassroomRoom() {
        Booking booking = mock(Booking.class);
        when(booking.getStatus()).thenReturn("PENDING");
        when(booking.getRoomId()).thenReturn(2L);
        when(bookings.findByIdForUpdate(8L)).thenReturn(Optional.of(booking));
        assertThrows(ResourceNotFoundException.class, () -> service.create(request));
        Room study = mock(Room.class);
        when(study.getType()).thenReturn("SELF_STUDY");
        when(rooms.findById(2L)).thenReturn(Optional.of(study));
        assertThrows(IllegalArgumentException.class, () -> service.create(request));
    }

    @Test void rejectsDuplicateAndOversizedSession() {
        Booking booking = mock(Booking.class);
        when(booking.getStatus()).thenReturn("CONFIRMED");
        when(booking.getRoomId()).thenReturn(2L);
        when(booking.getId()).thenReturn(8L);
        when(bookings.findByIdForUpdate(8L)).thenReturn(Optional.of(booking));
        Room room = mock(Room.class);
        when(room.getType()).thenReturn("LAB");
        when(rooms.findById(2L)).thenReturn(Optional.of(room));
        when(sessions.findByBookingId(8L)).thenReturn(Optional.of(mock(com.smartcampus.entity.ClassSession.class)));
        assertThrows(ReservationConflictException.class, () -> service.create(request));
        when(sessions.findByBookingId(8L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> service.create(new ClassSessionRequest(8L, "X".repeat(31), "Title")));
    }

    @Test void rejectsInvalidDateRanges() {
        LocalDate today = LocalDate.now();
        assertThrows(IllegalArgumentException.class, () -> service.listBetween(today, today.minusDays(1)));
        assertThrows(IllegalArgumentException.class, () -> service.listForStudent(3L, today, today.plusDays(32)));
        assertThrows(IllegalArgumentException.class, () -> service.listForStudent(3L, null, today));
    }

    @Test void listsEmptyRangesAndChecksVisibility() {
        when(sessions.findActiveOnDate(any(), any())).thenReturn(List.of());
        assertEquals(List.of(), service.listByDate(LocalDate.now()));
        when(sessions.findForStudent(3L)).thenReturn(List.of());
        assertEquals(List.of(), service.listForStudent(3L, null, null));
        when(sessions.countVisibleToStudent(5L, 3L)).thenReturn(1L);
        assertTrue(service.visibleToStudent(5L, 3L));
        assertFalse(service.visibleToStudent(6L, 3L));
        when(sessions.findForStudentBetween(eq(3L), any(), any())).thenReturn(List.of());
        assertEquals(List.of(), service.listForStudent(3L, LocalDate.now(), LocalDate.now().plusDays(1)));
    }

    @Test void absenceDecisionRequiresPendingRequest() {
        when(sessions.findById(5L)).thenReturn(Optional.of(mock(com.smartcampus.entity.ClassSession.class)));
        when(jdbc.query(contains("FROM absence_requests"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq(5L))).thenReturn(List.of());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.decideAbsence(5L, 1L, true)).getStatusCode());
    }
}
