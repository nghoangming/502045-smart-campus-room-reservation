package com.smartcampus.service;

import com.smartcampus.auth.AccessService;
import java.util.concurrent.atomic.AtomicReference;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.springframework.web.server.ResponseStatusException;

class UserInvitationServiceTest {
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
