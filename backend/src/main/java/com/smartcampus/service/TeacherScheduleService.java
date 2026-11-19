package com.smartcampus.service;

import com.smartcampus.dto.ClassSessionRequest;
import com.smartcampus.dto.ClassSessionResponse;
import com.smartcampus.dto.ReservationRequest;
import com.smartcampus.dto.ReservationResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TeacherScheduleService {
    private final ReservationService reservations;
    private final ClassSessionService sessions;

    public TeacherScheduleService(ReservationService reservations, ClassSessionService sessions) {
        this.reservations = reservations;
        this.sessions = sessions;
    }

    public record Request(@NotNull Long roomId, @NotNull OffsetDateTime startTime,
                          @NotNull OffsetDateTime endTime, @NotBlank String courseCode,
                          @NotBlank String title, Boolean makeup) { }
    public record Result(ReservationResponse reservation, ClassSessionResponse session) { }

    @Transactional
    public Result create(Request request, Long teacherId) {
        var booking = reservations.create(new ReservationRequest(request.roomId(), null,
                request.startTime(), request.endTime(), null), "CLASSROOM", teacherId);
        var session = sessions.create(new ClassSessionRequest(booking.id(), request.courseCode(),
                request.title(), request.makeup()));
        return new Result(booking, session);
    }
}
