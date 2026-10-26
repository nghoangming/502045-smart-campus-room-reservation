package com.smartcampus.service;

import com.smartcampus.dto.ClassSessionRequest;
import com.smartcampus.dto.ClassSessionResponse;
import com.smartcampus.entity.Booking;
import com.smartcampus.entity.ClassSession;
import com.smartcampus.exception.ReservationConflictException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ClassSessionRepository;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClassSessionService {
    private final BookingRepository bookingRepository;
    private final ClassSessionRepository classSessionRepository;

    public ClassSessionService(BookingRepository bookingRepository,
                               ClassSessionRepository classSessionRepository) {
        this.bookingRepository = bookingRepository;
        this.classSessionRepository = classSessionRepository;
    }

    @Transactional
    public ClassSessionResponse create(ClassSessionRequest request) {
        Booking booking = bookingRepository.findByIdForUpdate(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.bookingId()));
        if (!"PENDING".equals(booking.getStatus()) && !"CONFIRMED".equals(booking.getStatus())) {
            throw new IllegalArgumentException("Booking is not active: " + booking.getId());
        }
        if (classSessionRepository.findByBookingId(booking.getId()).isPresent()) {
            throw new ReservationConflictException("Booking already has a class session: " + booking.getId());
        }
        String code = request.courseCode().trim();
        String title = request.title().trim();
        if (code.length() > 30 || title.length() > 150) {
            throw new IllegalArgumentException("Course code or title is too long");
        }
        try {
            return toResponse(classSessionRepository.saveAndFlush(ClassSession.create(booking, code, title)));
        } catch (DataIntegrityViolationException ex) {
            if (DatabaseConflict.isConstraint(ex, "23505", "uq_class_sessions_booking")) {
                throw new ReservationConflictException("Booking already has a class session: " + booking.getId());
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<ClassSessionResponse> list() {
        return classSessionRepository.findAllByOrderByStartTimeAsc().stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ClassSessionResponse getById(Long id) {
        return toResponse(classSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class session not found: " + id)));
    }

    private ClassSessionResponse toResponse(ClassSession session) {
        return new ClassSessionResponse(session.getId(), session.getBookingId(),
                session.getCourseCode(), session.getTitle(), session.getRoomId(),
                session.getStartTime(), session.getEndTime(), session.getCreatedAt());
    }
}
