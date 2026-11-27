package com.smartcampus.service;

import com.smartcampus.auth.AccessService;
import java.util.concurrent.atomic.AtomicReference;
import java.util.List;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.springframework.web.server.ResponseStatusException;

class UserInvitationServiceTest {
    @Test
    void activationTokenFromCapturedEmailActivatesAccountOnce() throws Exception {
        AtomicReference<String> storedHash = new AtomicReference<>();
        AtomicReference<Boolean> used = new AtomicReference<>(false);
        AtomicReference<SimpleMailMessage> sent = new AtomicReference<>();
        JdbcTemplate jdbc = new JdbcTemplate() {
            @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
                if (sql.contains("INSERT INTO users")) return type.cast(12L);
                throw new AssertionError(sql);
            }
            @Override public <T> List<T> queryForList(String sql, Class<T> type, Object... args) {
                return List.of(type.cast("Luật"));
            }
            @Override public int update(String sql, Object... args) {
                if (sql.contains("INSERT INTO user_invites")) storedHash.set((String) args[1]);
                if (sql.contains("UPDATE user_invites SET used_at")) used.set(true);
                return 1;
            }
            @Override public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
                if (!sql.contains("FROM user_invites")) throw new AssertionError(sql);
                return !used.get() && storedHash.get().equals(args[0]) ? List.of((T) Long.valueOf(12)) : List.of();
            }
        };
        AccessService access = new AccessService(jdbc) {
            @Override public void requireRole(Long id, String role) { assertEquals("ADMIN", role); }
        };
        JavaMailSenderImpl mail = new JavaMailSenderImpl() {
            @Override public void send(SimpleMailMessage message) { sent.set(message); }
        };
        var service = new UserInvitationService(jdbc, access, mail, "sender@test.local", "configured", "http://localhost:3000");
        service.inviteTo(new UserInvitationService.InviteRequest("SI2300001", "Student",
                "si2300001@smartcampus.test", "STUDENT", "Luật"), 1L, "personal@test.local");
        String token = sent.get().getText().split("/activate\\?token=")[1].split("\\s")[0];
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        assertEquals(hash, storedHash.get());
        service.activate(new UserInvitationService.ActivateRequest(token, "newpassword123"));
        assertTrue(used.get());
        assertEquals(400, assertThrows(ResponseStatusException.class,
                () -> service.activate(new UserInvitationService.ActivateRequest(token, "newpassword123"))).getStatusCode().value());
    }
    @Test
    void sendsStudentActivationToPersonalEmailButKeepsSchoolEmailForLogin() {
        AtomicReference<Object[]> inserted = new AtomicReference<>();
        JdbcTemplate jdbc = new JdbcTemplate() {
            @Override public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
                if (sql.contains("INSERT INTO users")) inserted.set(args);
                return requiredType.cast(12L);
            }
            @Override public <T> List<T> queryForList(String sql, Class<T> elementType, Object... args) {
                assertEquals("I", args[0]);
                return List.of(elementType.cast("Luật"));
            }
            @Override public int update(String sql, Object... args) { return 1; }
        };
        AccessService access = new AccessService(jdbc) {
            @Override public void requireRole(Long userId, String role) {
                assertEquals(1L, userId);
                assertEquals("ADMIN", role);
            }
        };
        AtomicReference<SimpleMailMessage> sent = new AtomicReference<>();
        JavaMailSenderImpl mail = new JavaMailSenderImpl() {
            @Override public void send(SimpleMailMessage message) { sent.set(message); }
        };
        var service = new UserInvitationService(jdbc, access, mail,
                "smartcampussystem@gmail.com", "configured", "http://localhost:3000");
        var result = service.inviteTo(new UserInvitationService.InviteRequest(
                "SI2300001", "Nguyễn Văn Tâm", "si2300001@smartcampus.test", "STUDENT", "Luật"),
                1L, "nvtam000@gmail.com");
        assertEquals("si2300001@smartcampus.test", result.email());
        assertEquals("nvtam000@gmail.com", sent.get().getTo()[0]);
        assertTrue(sent.get().getText().contains("si2300001@smartcampus.test"));
        assertEquals("Luật", inserted.get()[4]);
        assertEquals("I", inserted.get()[5]);
    }

    @Test
    void rejectsFacultyThatDisagreesWithAccountCode() {
        JdbcTemplate jdbc = new JdbcTemplate() {
            @Override public <T> List<T> queryForList(String sql, Class<T> elementType, Object... args) {
                return List.of();
            }
        };
        AccessService access = new AccessService(jdbc) {
            @Override public void requireRole(Long userId, String role) { }
        };
        var service = new UserInvitationService(jdbc, access, new JavaMailSenderImpl(),
                "smartcampussystem@gmail.com", "configured", "http://localhost:3000");
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.inviteTo(
                new UserInvitationService.InviteRequest("SI2300001", "Student",
                        "student@example.test", "STUDENT", "Công nghệ thông tin"),
                1L, "personal@example.test")).getStatusCode().value());
    }
}
