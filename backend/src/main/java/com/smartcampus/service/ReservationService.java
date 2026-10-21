package com.smartcampus.service;

import com.smartcampus.dto.ReservationRequest;
import com.smartcampus.dto.ReservationResponse;
import com.smartcampus.entity.Booking;
import com.smartcampus.exception.ReservationConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReservationService {

    /**
     * Placeholder user-id until JWT authentication is wired in.
     * Replace with SecurityContext lookup once the auth layer is added.
     */
    private static final Long ANONYMOUS_USER_ID = 1L;

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public ReservationService(BookingRepository bookingRepository,
                              RoomRepository roomRepository) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
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
    public ReservationResponse create(ReservationRequest request) {
        if (!request.startTime().isBefore(request.endTime())) {
            throw new IllegalArgumentException("startTime must be strictly before endTime");
        }

        // Verify room exists
        roomRepository.findById(request.roomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.roomId()));

        // Conflict detection (overlap rule)
        List<Booking> conflicts = bookingRepository.findOverlappingBookings(
                request.roomId(), request.startTime(), request.endTime());
        if (!conflicts.isEmpty()) {
            throw new ReservationConflictException(
                    "Room " + request.roomId() + " is already booked during the requested time slot");
        }

        Booking booking = Booking.create(
                ANONYMOUS_USER_ID,
                request.roomId(),
                request.startTime(),
                request.endTime());

        return toResponse(bookingRepository.save(booking));
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    /**
     * Returns all reservations, optionally filtered by status.
     */
    @Transactional(readOnly = true)
    public List<ReservationResponse> list(String status) {
        List<Booking> bookings = (status != null && !status.isBlank())
                ? bookingRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase())
                : bookingRepository.findAllByOrderByCreatedAtDesc();

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
    public ReservationResponse getById(Long id) {
        Booking booking = findBooking(id);
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
    public ReservationResponse cancel(Long id) {
        Booking booking = findBooking(id);
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalArgumentException("Reservation " + id + " is already cancelled");
        }
        booking.cancel();
        return toResponse(bookingRepository.save(booking));
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Booking findBooking(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + id));
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
}
