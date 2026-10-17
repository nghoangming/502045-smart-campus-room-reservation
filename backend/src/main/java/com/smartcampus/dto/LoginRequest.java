package com.smartcampus.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Size(max = 100) String username,
        @Email @Size(max = 100) String email,
        @NotBlank @Size(max = 72) String password
) {
}
