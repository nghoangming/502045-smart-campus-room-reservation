package com.smartcampus.service;

import com.smartcampus.dto.SeatReservationRequest;
import com.smartcampus.entity.Booking;
import com.smartcampus.entity.ClassSession;
import com.smartcampus.entity.Seat;
import com.smartcampus.entity.SeatReservation;
import com.smartcampus.exception.SeatConflictException;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ClassSessionRepository;
import com.smartcampus.repository.SeatRepository;
import com.smartcampus.repository.SeatReservationRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doReturn;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SeatReservationServiceTest {
    @Mock ClassSessionRepository classSessions;
    @Mock BookingRepository bookings;
    @Mock SeatRepository seats;
    @Mock SeatReservationRepository reservations;
    @Mock JdbcTemplate jdbc;
    @Mock ClassSession session;
    @Mock Booking booking;
    @Mock Seat seat;
    @Mock SeatReservation reservation;

    private SeatReservationService service;
    private final SeatReservationRequest request = new SeatReservationRequest(20L, 30L);

    @BeforeEach
    void setUp() {
        service = new SeatReservationService(classSessions, bookings, seats, reservations, jdbc);
    }

    private void activeSessionAndSeat() {
        when(classSessions.findById(20L)).thenReturn(Optional.of(session));
        when(jdbc.queryForObject("SELECT calendar_status FROM class_session_calendar WHERE class_session_id=?",
                String.class, 20L)).thenReturn("SCHEDULED");
        when(session.getBookingId()).thenReturn(10L);
        when(session.getRoomId()).thenReturn(40L);
        when(session.getId()).thenReturn(20L);
        when(session.getEndTime()).thenReturn(OffsetDateTime.now().plusDays(1));
        when(bookings.findById(10L)).thenReturn(Optional.of(booking));
        when(booking.getStatus()).thenReturn("CONFIRMED");
        when(seats.findById(30L)).thenReturn(Optional.of(seat));
        when(seat.getRoomId()).thenReturn(40L);
        when(seat.getStatus()).thenReturn("AVAILABLE");
        when(seat.getId()).thenReturn(30L);
    }

    @Test
    void rejectsSecondSeatOnlyWithinSameSession() {
        activeSessionAndSeat();
        when(reservations.existsByClassSessionIdAndUserIdAndStatus(20L, 1L, "CONFIRMED"))
                .thenReturn(true);
        assertThrows(SeatConflictException.class, () -> service.create(request, 1L));
    }

    @Test
    void confirmsHoldThroughDatabaseFunctions() {
        activeSessionAndSeat();
        when(jdbc.queryForObject("SELECT set_config('app.user_id', ?, true)",
                String.class, "1")).thenReturn("1");
        when(jdbc.queryForObject("SELECT set_config('app.role', ?, true)",
                String.class, "STUDENT")).thenReturn("STUDENT");
        when(jdbc.queryForObject("SELECT seat_reservation_id FROM hold_class_seat(?,?,?)",
                Long.class, 20L, 30L, 1L)).thenReturn(50L);
        when(jdbc.queryForObject("SELECT seat_reservation_id FROM confirm_class_seat(?,?)",
                Long.class, 50L, 1L)).thenReturn(50L);
        when(reservations.findById(50L)).thenReturn(Optional.of(reservation));
        when(reservation.getStatus()).thenReturn("CONFIRMED");

        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            assertEquals("CONFIRMED", service.create(request, 1L).status());
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
        verify(jdbc).queryForObject("SELECT seat_reservation_id FROM hold_class_seat(?,?,?)",
                Long.class, 20L, 30L, 1L);
        verify(jdbc).queryForObject("SELECT seat_reservation_id FROM confirm_class_seat(?,?)",
                Long.class, 50L, 1L);
    }

    @Test
    void holdsSeatWithoutConfirmingAndReturnsOriginalDeadline() {
        activeSessionAndSeat();
        OffsetDateTime deadline = OffsetDateTime.now().plusMinutes(2);
        when(jdbc.queryForObject("SELECT set_config('app.user_id', ?, true)",
                String.class, "1")).thenReturn("1");
        when(jdbc.queryForObject("SELECT set_config('app.role', ?, true)",
                String.class, "STUDENT")).thenReturn("STUDENT");
        when(jdbc.queryForObject("SELECT seat_reservation_id FROM hold_class_seat(?,?,?)",
                Long.class, 20L, 30L, 1L)).thenReturn(50L);
        when(jdbc.queryForObject("SELECT hold_expires_at FROM seat_reservations WHERE seat_reservation_id=?",
                OffsetDateTime.class, 50L)).thenReturn(deadline);

        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            assertEquals(deadline, service.hold(request, 1L).expiresAt());
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
        }
        verify(jdbc, never()).queryForObject("SELECT seat_reservation_id FROM confirm_class_seat(?,?)",
                Long.class, 50L, 1L);
    }

    @Test
    void closedSessionCannotBeBooked() {
        when(classSessions.findById(20L)).thenReturn(Optional.of(session));
        when(session.getEndTime()).thenReturn(OffsetDateTime.now().minusMinutes(1));

        assertThrows(IllegalArgumentException.class, () -> service.create(request, 1L));
        verifyNoInteractions(bookings, seats);
    }

    @Test
    void closedSessionSeatMapRemainsReadable() {
        OffsetDateTime pastEnd = OffsetDateTime.now().minusMinutes(1);
        Booking pastBooking = Booking.create(1L, 40L, pastEnd.minusHours(1), pastEnd);
        pastBooking.approve();
        ReflectionTestUtils.setField(pastBooking, "id", 10L);
        ClassSession pastSession = ClassSession.create(pastBooking, "CS101", "Past class", false);
        ReflectionTestUtils.setField(pastSession, "id", 20L);
        when(classSessions.findById(20L)).thenReturn(Optional.of(pastSession));
        when(jdbc.queryForObject("SELECT calendar_status FROM class_session_calendar WHERE class_session_id=?",
                String.class, 20L)).thenReturn("SCHEDULED");
        when(bookings.findById(10L)).thenReturn(Optional.of(pastBooking));

        assertEquals(List.of(), service.listSeats(20L));
    }

    @Test
    void seatMapDistinguishesTemporaryHoldFromConfirmedSeat() {
        when(classSessions.findById(20L)).thenReturn(Optional.of(session));
        when(jdbc.queryForObject("SELECT calendar_status FROM class_session_calendar WHERE class_session_id=?",
                String.class, 20L)).thenReturn("SCHEDULED");
        when(session.getBookingId()).thenReturn(10L);
        when(session.getRoomId()).thenReturn(40L);
        when(session.getId()).thenReturn(20L);
        when(bookings.findById(10L)).thenReturn(Optional.of(booking));
        when(booking.getStatus()).thenReturn("CONFIRMED");
        when(seats.findByRoomIdOrderBySeatNumber(40L)).thenReturn(List.of(seat));
        when(seat.getId()).thenReturn(30L);
        doReturn(List.of(), List.of(30L)).when(jdbc).query(
                eq("SELECT seat_id FROM class_seat_availability WHERE class_session_id=? AND reservation_status='RESERVED'"),
                any(org.springframework.jdbc.core.RowMapper.class), eq(20L));
        doReturn(List.of(30L), List.of()).when(jdbc).query(
                eq("SELECT seat_id FROM class_seat_availability WHERE class_session_id=? AND reservation_status='PENDING'"),
                any(org.springframework.jdbc.core.RowMapper.class), eq(20L));
        doReturn(List.of()).when(jdbc).query(
                eq("SELECT seat_id FROM class_seat_availability WHERE class_session_id=? AND reservation_status='UNAVAILABLE'"),
                any(org.springframework.jdbc.core.RowMapper.class), eq(20L));

        assertEquals("PENDING", service.listSeats(20L).getFirst().status());
        assertEquals("RESERVED", service.listSeats(20L).getFirst().status());
    }

    @Test
    void closedSessionSeatCannotBeCancelled() {
        when(reservations.findById(50L)).thenReturn(Optional.of(reservation));
        when(reservation.getUserId()).thenReturn(1L);
        when(reservation.getClassSessionId()).thenReturn(20L);
        when(classSessions.findById(20L)).thenReturn(Optional.of(session));
        when(session.getEndTime()).thenReturn(OffsetDateTime.now().minusMinutes(1));

        assertThrows(IllegalArgumentException.class, () -> service.cancel(50L, 1L));
        verifyNoInteractions(jdbc);
    }
}
