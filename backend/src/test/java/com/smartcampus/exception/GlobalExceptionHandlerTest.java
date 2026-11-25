package com.smartcampus.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void deadlockReturnsRetryableConflictInsteadOfServerError() {
        var error = new DataIntegrityViolationException("concurrent booking",
                new SQLException("deadlock detected", "40P01"));

        var response = handler.handleDatabaseError(error);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals(409, response.getBody().status());
        assertEquals("Concurrent update detected. Please retry.", response.getBody().message());
    }

    @Test
    void serializationFailureReturnsRetryableConflict() {
        var error = new DataIntegrityViolationException("concurrent booking",
                new SQLException("serialization failure", "40001"));

        assertEquals(HttpStatus.CONFLICT, handler.handleDatabaseError(error).getStatusCode());
    }
}
