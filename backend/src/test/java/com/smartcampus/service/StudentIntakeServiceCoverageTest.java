package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
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
class StudentIntakeServiceCoverageTest {
    @Mock JdbcTemplate jdbc;
    @Mock UserInvitationService invitations;
    StudentIntakeService service;
    StudentIntakeService.Submission valid = new StudentIntakeService.Submission(
            "Test Student", "012345678", LocalDate.of(2005, 1, 1), "OTHER", "student@test.local", "A", 2025);

    @BeforeEach void setUp() { service = new StudentIntakeService(jdbc, invitations, "school.test"); }

    @Test void rejectsInvalidRegistrationBeforeWriting() {
        for (StudentIntakeService.Submission invalid : List.of(
                new StudentIntakeService.Submission(" ", null, null, null, "student@test.local", "A", 2025),
                new StudentIntakeService.Submission("Student", null, null, null, "bad", "A", 2025),
                new StudentIntakeService.Submission("Student", null, null, null, "student@test.local", "Z", 2025),
                new StudentIntakeService.Submission("Student", null, null, null, "student@test.local", "A", 1999),
                new StudentIntakeService.Submission("Student", null, null, "INVALID", "student@test.local", "A", 2025))) {
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                    () -> service.submit(invalid)).getStatusCode());
        }
        verifyNoInteractions(jdbc);
    }

    @Test void duplicatePersonalEmailReturnsConflict() {
        when(jdbc.queryForObject(contains("INSERT INTO student_intake"), eq(Long.class), any(Object[].class)))
                .thenThrow(new DataIntegrityViolationException("duplicate"));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.submit(valid)).getStatusCode());
    }

    @Test void retryRejectsUnknownOrProcessedApplication() {
        when(jdbc.query(contains("FOR UPDATE"), org.mockito.ArgumentMatchers.<RowMapper<StudentIntakeService.Intake>>any(), eq(7L)))
                .thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.retry(7L, 1L)).getStatusCode());
    }

    @Test void rejectRequiresPendingApplication() {
        when(jdbc.update(contains("UPDATE student_intake SET status='REJECTED'"), eq(7L))).thenReturn(0);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.reject(7L)).getStatusCode());
    }

    @Test void invalidSchoolDomainPreventsApproval() {
        StudentIntakeService badDomain = new StudentIntakeService(jdbc, invitations, "invalid");
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, assertThrows(ResponseStatusException.class,
                () -> badDomain.retry(7L, 1L)).getStatusCode());
        verifyNoInteractions(jdbc);
    }
}
