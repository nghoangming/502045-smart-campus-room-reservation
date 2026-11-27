package com.smartcampus.dto;

import java.time.OffsetDateTime;

public record SeatHoldResponse(Long id, Long classSessionId, Long seatId, OffsetDateTime expiresAt) { }
