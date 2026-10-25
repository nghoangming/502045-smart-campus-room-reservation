package com.smartcampus.repository;

import com.smartcampus.entity.Booking;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /**
     * Overlap rule: existing.startTime < requested.endTime AND existing.endTime > requested.startTime.
     * Excludes cancelled / rejected bookings from conflict check.
     */
    @Query("""
            select b from Booking b
            where b.roomId = :roomId
              and upper(b.status) not in ('CANCELLED', 'CANCELED', 'REJECTED')
              and b.startTime < :endTime
              and b.endTime > :startTime
            order by b.startTime
            """)
    List<Booking> findOverlappingBookings(
            @Param("roomId") Long roomId,
            @Param("startTime") OffsetDateTime startTime,
            @Param("endTime") OffsetDateTime endTime);

    /**
     * List all bookings, ordered by creation time descending.
     */
    List<Booking> findAllByOrderByCreatedAtDesc();

    /**
     * List bookings filtered by status.
     */
    List<Booking> findByStatusOrderByCreatedAtDesc(String status);
}
