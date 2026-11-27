package com.smartcampus.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.smartcampus.auth.AccessService;
import java.util.List;
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
class IncidentCoverageTest {
    @Mock JdbcTemplate jdbc;
    @Mock AccessService access;
    IncidentController controller;
    @BeforeEach void setUp() { controller = new IncidentController(jdbc, access); }

    @Test void adminListsAllAndTeacherListsOwn() {
        when(access.hasRole(1L, "ADMIN")).thenReturn(true);
        assertEquals(List.of(), controller.list(1L));
        assertEquals(List.of(), controller.list(2L));
        verify(access).requireRole(2L, "TEACHER");
    }

    @Test void reportingRejectsUnknownCategoryAndMismatchedResource() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.report(new IncidentController.Report(1L, null, "UNKNOWN", "Broken equipment"), 2L)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.report(new IncidentController.Report(1L, 3L, "PROJECTOR", "Broken equipment"), 2L)).getStatusCode());
    }

    @Test void reportingPersistsIncidentAndReadsItBack() {
        when(jdbc.queryForObject(contains("INSERT INTO incidents"), eq(Long.class), any(Object[].class))).thenReturn(7L);
        IncidentController.Incident incident = new IncidentController.Incident(7L, 1L, "A101", null, 2L, "Teacher", "OTHER", "Broken equipment", "OPEN", null, null, null);
        when(jdbc.query(contains("WHERE i.incident_id=?"), org.mockito.ArgumentMatchers.<RowMapper<IncidentController.Incident>>any(), eq(7L))).thenReturn(List.of(incident));
        assertEquals(incident, controller.report(new IncidentController.Report(1L, null, "OTHER", " Broken equipment "), 2L));
    }

    @Test void decisionRejectsBadStatusMissingIncidentAndInvalidTransition() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.decide(7L, new IncidentController.Decision("INVALID", null), 1L)).getStatusCode());
        when(jdbc.query(contains("SELECT status FROM incidents"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(7L))).thenReturn(List.of());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.decide(7L, new IncidentController.Decision("RESOLVED", null), 1L)).getStatusCode());
        when(jdbc.query(contains("SELECT status FROM incidents"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(7L))).thenReturn(List.of("RESOLVED"));
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> controller.decide(7L, new IncidentController.Decision("OPEN", null), 1L)).getStatusCode());
    }

    @Test void decisionValidatesAssigneeAndUpdateResult() {
        when(jdbc.query(contains("SELECT status FROM incidents"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(7L))).thenReturn(List.of("OPEN"));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.decide(7L, new IncidentController.Decision("IN_PROGRESS", 99L), 1L)).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.decide(7L, new IncidentController.Decision("RESOLVED", null), 1L)).getStatusCode());
    }
}
