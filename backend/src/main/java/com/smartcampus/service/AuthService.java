package com.smartcampus.service;

import com.smartcampus.config.SecurityConfig;
import com.smartcampus.dto.LoginRequest;
import com.smartcampus.dto.LoginResponse;
import com.smartcampus.dto.UserResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final String dummyPasswordHash;

    public AuthService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.dummyPasswordHash = passwordEncoder.encode("unused-account-timing-check");
    }

    public LoginResponse login(LoginRequest request) {
        String identifier = request.email() != null ? request.email() : request.username();
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("Username or email is required");
        }
        List<Account> accounts = jdbcTemplate.query("""
                SELECT user_id, user_code, full_name, email, password_hash
                FROM users WHERE lower(user_code) = lower(?) OR lower(email) = lower(?)
                """, (resultSet, rowNumber) -> new Account(
                resultSet.getLong("user_id"), resultSet.getString("user_code"),
                resultSet.getString("full_name"), resultSet.getString("email"),
                resultSet.getString("password_hash")), identifier.trim(), identifier.trim());
        Account account = accounts.size() == 1 ? accounts.getFirst() : null;
        boolean passwordMatches = request.password().getBytes(StandardCharsets.UTF_8).length <= 72
                && passwordEncoder.matches(request.password(), account == null ? dummyPasswordHash : account.passwordHash());
        if (account == null || !passwordMatches) {
            throw new BadCredentialsException("Incorrect username or password. Please try again.");
        }
        UserResponse user = toResponse(account);
        Instant issuedAt = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(SecurityConfig.TOKEN_ISSUER)
                .subject(account.id().toString())
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(1, ChronoUnit.HOURS))
                .claim("roles", user.roles())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, user);
    }

    public UserResponse getCurrentUser(String subject) {
        List<Account> accounts = jdbcTemplate.query("""
                SELECT user_id, user_code, full_name, email, password_hash FROM users WHERE user_id = ?
                """, (resultSet, rowNumber) -> new Account(
                resultSet.getLong("user_id"), resultSet.getString("user_code"),
                resultSet.getString("full_name"), resultSet.getString("email"),
                resultSet.getString("password_hash")), Long.valueOf(subject));
        if (accounts.isEmpty()) {
            throw new BadCredentialsException("Account is no longer available");
        }
        return toResponse(accounts.getFirst());
    }

    private UserResponse toResponse(Account account) {
        List<String> roles = jdbcTemplate.queryForList("""
                SELECT roles.role_name FROM roles
                JOIN user_roles ON user_roles.role_id = roles.role_id
                WHERE user_roles.user_id = ? ORDER BY roles.role_name
                """, String.class, account.id());
        return new UserResponse(account.id(), account.username(), account.fullName(), account.email(),
                roles.isEmpty() ? null : roles.getFirst(), roles);
    }

    private record Account(Long id, String username, String fullName, String email, String passwordHash) {
    }
}
