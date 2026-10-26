package com.smartcampus.exception;

import org.springframework.http.HttpStatus;
import org.springframework.dao.CannotAcquireLockException;
import jakarta.persistence.PessimisticLockException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleResourceNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse(
                404,
                ex.getMessage()
        );
    }

    @ExceptionHandler(ReservationConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(ReservationConflictException ex) {
        return new ErrorResponse(409, ex.getMessage());
    }

    @ExceptionHandler(SeatConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleSeatConflict(SeatConflictException ex) {
        return new ErrorResponse(409, ex.getMessage());
    }

    @ExceptionHandler({PessimisticLockException.class, CannotAcquireLockException.class})
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleLockConflict(Exception ex) {
        return new ErrorResponse(409, "Resource is currently busy. Please retry.");
    }

    @ExceptionHandler({IllegalArgumentException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class,
            MethodArgumentNotValidException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBadRequest(Exception ex) {
        return new ErrorResponse(400, ex.getMessage() == null ? "Invalid request" : ex.getMessage());
    }
}
