package com.smartcampus.dto;

public record LoginResponse(String token, UserResponse user) {
}
