package com.smartcampus.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartcampus.service.QrAttendanceService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QrAttendanceAuthorizationTest {
    @Mock QrAttendanceService service;

    @Test
    void delegatesQrGenerationToTheAuthenticatedTeacher() {
        QrAttendanceController controller = new QrAttendanceController(service);
        var expected = new QrAttendanceController.QrResponse(7L, "ABCDE", java.time.OffsetDateTime.now());
        when(service.generate(7L, 42L)).thenReturn(expected);

        assertEquals(expected, controller.generate(7L, 42L));
        verify(service).generate(7L, 42L);
    }

    @Test
    void delegatesCheckInToTheAuthenticatedStudentAndValidatesRequiredQr() {
        QrAttendanceController controller = new QrAttendanceController(service);
        var request = new QrAttendanceController.CheckInRequest("ABCDE", 7L);
        var expected = new QrAttendanceController.AttendanceResponse(1L, 7L, 42L, 2L, 4, "PRESENT", null);
        when(service.checkIn(request, 42L)).thenReturn(expected);

        assertEquals(expected, controller.checkIn(request, 42L));
        verify(service).checkIn(request, 42L);
    }

    @Test
    void delegatesAttendanceListAndCancellationToAuthenticatedTeacher() {
        QrAttendanceController controller = new QrAttendanceController(service);
        when(service.list(7L, 42L)).thenReturn(List.of());

        assertEquals(List.of(), controller.list(7L, 42L));
        controller.cancel(1L, 42L);
        verify(service).list(7L, 42L);
        verify(service).cancel(1L, 42L);
    }
}
