package com.smartcampus.dto;

import java.util.List;

public record UserResponse(
        Long id, String username, String fullName, String email, String role, List<String> roles
) {
}
