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
class ResourceCoverageTest {
    @Mock JdbcTemplate jdbc;
    @Mock AccessService access;
    ResourceController controller;
    ResourceController.Write valid = new ResourceController.Write("Projector", "DEVICE", 1, "AVAILABLE");
    @BeforeEach void setUp() { controller = new ResourceController(jdbc, access); }

    @Test void viewerNeedsPermission() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> controller.list(3L)).getStatusCode());
        lenient().when(access.hasPermission(2L, "TEACHER", "VIEW_RESOURCES")).thenReturn(true);
        assertEquals(List.of(), controller.list(2L));
    }

    @Test void missingResourceReturns404() {
        when(access.hasPermission(1L, "ADMIN", "VIEW_RESOURCES")).thenReturn(true);
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.get(7L, 1L)).getStatusCode());
    }

    @Test void resourceWritesValidateStatus() {
        ResourceController.Write invalid = new ResourceController.Write("Projector", "DEVICE", 1, "UNKNOWN");
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.create(1L, invalid, 1L)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> controller.update(7L, invalid, 1L)).getStatusCode());
    }

    @Test void createWritesResourceAndReturnsIt() {
        when(jdbc.queryForObject(contains("INSERT INTO resources"), eq(Long.class), any(Object[].class))).thenReturn(7L);
        ResourceController.Resource resource = new ResourceController.Resource(7L, 1L, "Projector", "DEVICE", 1, "AVAILABLE");
        when(jdbc.query(contains("FROM resources WHERE resource_id=?"), org.mockito.ArgumentMatchers.<RowMapper<ResourceController.Resource>>any(), eq(7L))).thenReturn(List.of(resource));
        assertEquals(resource, controller.create(1L, valid, 1L));
    }

    @Test void updateRequiresExistingResource() {
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> controller.update(7L, valid, 1L)).getStatusCode());
    }
}
