package com.smartcampus.service;

import com.smartcampus.dto.RoomResponse;
import com.smartcampus.dto.RoomScheduleResponse;
import com.smartcampus.entity.Booking;
import com.smartcampus.entity.Room;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.RoomRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private static final ZoneId CAMPUS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final JdbcTemplate jdbc;

    public RoomService(RoomRepository roomRepository, BookingRepository bookingRepository, JdbcTemplate jdbc) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
        this.jdbc = jdbc;
    }

    public List<RoomResponse> getRooms() {
        Map<Long, Integer> capacities = capacities();
        return roomRepository.findAll().stream().map(room -> toResponse(room, capacities)).toList();
    }

    public RoomResponse getRoomById(Long id) {
        return toResponse(findRoom(id));
    }

    public List<RoomScheduleResponse> getSchedule(Long roomId, LocalDate date) {
        findRoom(roomId);
        OffsetDateTime dayStart = date.atStartOfDay(CAMPUS_ZONE).toOffsetDateTime();
        OffsetDateTime dayEnd = date.plusDays(1).atStartOfDay(CAMPUS_ZONE).toOffsetDateTime();
        return bookingRepository.findOverlappingBookings(roomId, dayStart, dayEnd).stream()
                .map(this::toScheduleResponse)
                .toList();
    }

    public List<RoomResponse> getAvailableRooms(LocalDate date, LocalTime startTime, LocalTime endTime) {
        OffsetDateTime start = date.atTime(startTime).atZone(CAMPUS_ZONE).toOffsetDateTime();
        OffsetDateTime end = date.atTime(endTime).atZone(CAMPUS_ZONE).toOffsetDateTime();
        var busyIds = bookingRepository.findActiveOverlapping(start, end).stream()
                .map(Booking::getRoomId).collect(Collectors.toSet());
        Map<Long, Integer> capacities = capacities();
        return roomRepository.findAll().stream()
                .filter(room -> "ACTIVE".equalsIgnoreCase(room.getStatus()))
                .filter(room -> !busyIds.contains(room.getId()))
                .map(room -> toResponse(room, capacities))
                .toList();
    }

    private Room findRoom(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + id));
    }

    private RoomResponse toResponse(Room room) {
        Integer capacity = jdbc.queryForObject("SELECT count(*) FROM seats WHERE room_id = ?", Integer.class, room.getId());
        return new RoomResponse(room.getId(), room.getCode(), room.getName(), room.getLocation(), room.getStatus(), room.getType(), capacity);
    }

    private RoomResponse toResponse(Room room, Map<Long, Integer> capacities) {
        return new RoomResponse(room.getId(), room.getCode(), room.getName(), room.getLocation(),
                room.getStatus(), room.getType(), capacities.getOrDefault(room.getId(), 0));
    }

    private Map<Long, Integer> capacities() {
        return jdbc.query("SELECT room_id, count(*) AS capacity FROM seats GROUP BY room_id",
                rs -> {
                    Map<Long, Integer> values = new java.util.HashMap<>();
                    while (rs.next()) values.put(rs.getLong("room_id"), rs.getInt("capacity"));
                    return values;
                });
    }

    private RoomScheduleResponse toScheduleResponse(Booking booking) {
        return new RoomScheduleResponse(booking.getId(), booking.getStartTime(), booking.getEndTime(), booking.getStatus());
    }
}
