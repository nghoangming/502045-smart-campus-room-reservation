package com.smartcampus.service;

import com.smartcampus.dto.ReservationRequest;
import com.smartcampus.dto.ReservationResponse;
import com.smartcampus.entity.Booking;
import com.smartcampus.entity.Room;
import com.smartcampus.exception.ReservationConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ClassSessionRepository;
import com.smartcampus.repository.RoomRepository;
import com.smartcampus.repository.SeatReservationRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.time.OffsetDateTime;

@Service
public class ReservationService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final ClassSessionRepository classSessionRepository;
    private final SeatReservationRepository seatReservationRepository;
    private final JdbcTemplate jdbc;

    @Autowired
    public ReservationService(BookingRepository bookingRepository,
                              RoomRepository roomRepository,
                              ClassSessionRepository classSessionRepository,
                              SeatReservationRepository seatReservationRepository,
                              JdbcTemplate jdbc) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
        this.classSessionRepository = classSessionRepository;
        this.seatReservationRepository = seatReservationRepository;
        this.jdbc = jdbc;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Creates a reservation.
     *
     * <p>Validates that:
     * <ul>
     *   <li>startTime is strictly before endTime (400)
     *   <li>the room exists (404)
     *   <li>no active booking for the same room overlaps the requested interval (409)
     * </ul>
     *
     * @throws IllegalArgumentException        400 – invalid time range
     * @throws ResourceNotFoundException       404 – room not found
     * @throws ReservationConflictException    409 – time overlap
     */
    @Transactional
    public ReservationResponse create(ReservationRequest request, String roomType, Long userId) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("startTime must be strictly before endTime");
        }
        if (!request.startTime().isAfter(OffsetDateTime.now())) {
            throw new IllegalArgumentException("startTime must be in the future");
        }

        // Verify room exists
        Room room = roomRepository.findByIdForUpdate(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.roomId()));
        if (!"ACTIVE".equalsIgnoreCase(room.getStatus())) {
            throw new IllegalArgumentException("Room is not active: " + request.roomId());
        }
        if (!RoomCategory.matches(room, roomType)) {
            throw new IllegalArgumentException("Room is not of type " + roomType);
        }

        // Conflict detection (overlap rule)
        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
                request.roomId(), request.startTime(), request.endTime());
        if (!conflicts.isEmpty()) {
            throw new ReservationConflictException(
                    "Room " + request.roomId() + " is already booked during the requested time slot");
        }

        Booking booking = Booking.create(
                userId,
                request.roomId(),
                request.startTime(),
                request.endTime());

        try {
            // Flush here so the database exclusion constraint is evaluated before
            // this method returns. It closes the race left by the overlap query.
            return toResponse(bookingRepository.saveAndFlush(booking));
        } catch (DataIntegrityViolationException ex) {
            if (DatabaseConflict.hasSqlState(ex, "23P01")) {
                throw new ReservationConflictException(
                        "Room or user already has a booking during the requested time slot");
            }
            throw ex;
        }
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    /**
     * Returns all reservations, optionally filtered by status.
     */
    @Transactional(readOnly = true)
    public List<ReservationResponse> list(String status, String roomType) {
        List<Long> roomIds = roomRepository.findAll().stream()
                .filter(room -> RoomCategory.matches(room, roomType))
                .map(Room::getId).toList();
        if (roomIds.isEmpty()) {
            return List.of();
        }
        List<Booking> bookings = bookingRepository.findByRoomIdInOrderByCreatedAtDesc(roomIds);
        if (status != null && !status.isBlank()) {
            bookings = bookings.stream().filter(b -> b.getStatus().equalsIgnoreCase(status)).toList();
        }

        return bookings.stream().map(this::toResponse).toList();
    }

    // -------------------------------------------------------------------------
    // Detail
    // -------------------------------------------------------------------------

    /**
     * Returns a single reservation by id.
     *
     * @throws ResourceNotFoundException 404
     */
    @Transactional(readOnly = true)
    public ReservationResponse getById(Long id, String roomType) {
        Booking booking = findBooking(id);
        assertRoomType(booking, roomType);
        return toResponse(booking);
    }

    // -------------------------------------------------------------------------
    // Cancel
    // -------------------------------------------------------------------------

    /**
     * Cancels a reservation by id.
     *
     * @throws ResourceNotFoundException 404
     * @throws IllegalArgumentException  400 – already cancelled
     */
    @Transactional
    public ReservationResponse cancel(Long id, String roomType, Long actorId) {
        // The database function locks the class session before the booking.
        // Taking the booking lock here first would invert that order.
        Booking booking = findBooking(id);
        assertRoomType(booking, roomType);
        if (!"PENDING".equals(booking.getStatus()) && !"CONFIRMED".equals(booking.getStatus())) {
            throw new IllegalArgumentException("Reservation " + id + " is not active");
        }
        return jdbc.queryForObject("SELECT booking_id,user_id,room_id,start_time,end_time,status,created_at FROM cancel_booking(?,?,?)",
                (rs, row) -> responseFromRow(rs), id, actorId, null);
    }

    @Transactional
    public ReservationResponse decide(Long id, String roomType, boolean approve, Long adminId) {
        Booking booking = findBooking(id);
        assertRoomType(booking, roomType);
        if (!"PENDING".equals(booking.getStatus())) {
            throw new IllegalArgumentException("Only pending reservations can be reviewed");
        }
        return jdbc.queryForObject("SELECT booking_id,user_id,room_id,start_time,end_time,status,created_at FROM review_booking(?,?,?,?)",
                (rs, row) -> responseFromRow(rs), id, adminId, approve, null);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Booking findBooking(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));
    }

    private void assertRoomType(Booking booking, String roomType) {
        Room room = roomRepository.findById(booking.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + booking.getRoomId()));
        if (!RoomCategory.matches(room, roomType)) {
            throw new ResourceNotFoundException("Reservation not found: " + booking.getId());
        }
    }

    private ReservationResponse toResponse(Booking b) {
        return new ReservationResponse(
                b.getId(),
                b.getUserId(),
                b.getRoomId(),
                b.getStartTime(),
                b.getEndTime(),
                b.getStatus(),
                b.getCreatedAt());
    }

    private ReservationResponse responseFromRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new ReservationResponse(rs.getLong("booking_id"), rs.getLong("user_id"), rs.getLong("room_id"),
                rs.getObject("start_time", OffsetDateTime.class), rs.getObject("end_time", OffsetDateTime.class),
                rs.getString("status"), rs.getObject("created_at", OffsetDateTime.class));
    }

}
