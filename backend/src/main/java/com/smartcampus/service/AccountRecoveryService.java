package com.smartcampus.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountRecoveryService {
    private final JdbcTemplate jdbc;
    private final JavaMailSender mail;
    private final String sender;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public AccountRecoveryService(JdbcTemplate jdbc, JavaMailSender mail,
            @Value("${spring.mail.username}") String sender,
            @Value("${app.frontend.url}") String frontendUrl) {
        this.jdbc = jdbc; this.mail = mail; this.sender = sender; this.frontendUrl = frontendUrl;
    }

    public record EmailChange(String email, String currentPassword) { }
    public record RecoveryRequest(String personalEmail) { }
    public record TokenRequest(String token) { }
    public record ResetRequest(String token, String password) { }

    @Transactional
    public void requestEmailChange(long userId, EmailChange request) {
        String email = normalizedEmail(request.email());
        if (email == null || request.currentPassword() == null || request.currentPassword().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần email mới và mật khẩu hiện tại.");
        List<String[]> users = jdbc.query("SELECT password_hash, personal_email FROM users WHERE user_id=?",
                (rs, row) -> new String[] { rs.getString(1), rs.getString(2) }, userId);
        if (users.isEmpty() || !passwords.matches(request.currentPassword(), users.getFirst()[0]))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
        if (email.equalsIgnoreCase(users.getFirst()[1]))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email mới phải khác email hiện tại.");
        Integer taken = jdbc.queryForObject("SELECT count(*) FROM users WHERE lower(personal_email)=? AND user_id<>? AND personal_email_verified=TRUE",
                Integer.class, email, userId);
        if (taken != null && taken > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email cá nhân đã được dùng cho tài khoản khác.");
        String token = createToken(userId, "EMAIL_CHANGE", email, 24);
        send(email, "Xác thực email cá nhân TDTU Smart Campus",
                "Mở liên kết để xác nhận email cá nhân mới (hiệu lực 24 giờ):\n" + url("/verify-personal-email?token=", token));
    }

    @Transactional
    public void verifyEmailChange(TokenRequest request) {
        Action action = validAction(request.token(), "EMAIL_CHANGE");
        Integer taken = jdbc.queryForObject("SELECT count(*) FROM users WHERE lower(personal_email)=? AND user_id<>? AND personal_email_verified=TRUE",
                Integer.class, action.email(), action.userId());
        if (taken != null && taken > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email cá nhân đã được dùng cho tài khoản khác.");
        jdbc.update("UPDATE users SET personal_email=?, personal_email_verified=TRUE, updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                action.email(), action.userId());
        consume(action.id());
    }

    @Transactional
    public void requestReset(RecoveryRequest request) {
        String email = normalizedEmail(request.personalEmail());
        if (email == null) return;
        List<Long> ids = jdbc.query("""
            SELECT user_id FROM users WHERE lower(personal_email)=? AND personal_email_verified=TRUE
              AND email_verified=TRUE
            """, (rs, row) -> rs.getLong(1), email);
        if (ids.size() != 1) return;
        long userId = ids.getFirst();
        Integer recent = jdbc.queryForObject("""
            SELECT count(*) FROM account_action_tokens WHERE user_id=? AND purpose='PASSWORD_RESET'
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '2 minutes'
            """, Integer.class, userId);
        if (recent != null && recent > 0) return;
        String token = createToken(userId, "PASSWORD_RESET", null, 1);
        send(email, "Đặt lại mật khẩu TDTU Smart Campus",
                "Mở liên kết để đặt lại mật khẩu (hiệu lực 1 giờ):\n" + url("/reset-password?token=", token)
                + "\nNếu không yêu cầu, hãy bỏ qua email này.");
    }

    @Transactional
    public void resetPassword(ResetRequest request) {
        if (request.password() == null || request.password().length() < 8)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải có ít nhất 8 ký tự.");
        Action action = validAction(request.token(), "PASSWORD_RESET");
        jdbc.update("UPDATE users SET password_hash=?, auth_version=auth_version+1, updated_at=CURRENT_TIMESTAMP WHERE user_id=?",
                passwords.encode(request.password()), action.userId());
        jdbc.update("UPDATE account_action_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose='PASSWORD_RESET' AND used_at IS NULL",
                action.userId());
    }

    private String createToken(long userId, String purpose, String email, int hours) {
        jdbc.update("UPDATE account_action_tokens SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND purpose=? AND used_at IS NULL",
                userId, purpose);
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("INSERT INTO account_action_tokens(user_id,purpose,target_email,token_hash,expires_at) VALUES (?,?,?,?,?)",
                userId, purpose, email, hash(token), OffsetDateTime.now().plusHours(hours));
        return token;
    }

    private record Action(long id, long userId, String email) { }
    private Action validAction(String token, String purpose) {
        if (token == null || token.isBlank()) throw invalidToken();
        List<Action> rows = jdbc.query("""
            SELECT token_id,user_id,target_email FROM account_action_tokens
            WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP FOR UPDATE
            """, (rs, row) -> new Action(rs.getLong(1), rs.getLong(2), rs.getString(3)), hash(token), purpose);
        if (rows.isEmpty()) throw invalidToken();
        return rows.getFirst();
    }
    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết không hợp lệ hoặc đã hết hạn.");
    }
    private void consume(long id) { jdbc.update("UPDATE account_action_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_id=?", id); }
    private String normalizedEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase(java.util.Locale.ROOT);
        return normalized.length() <= 100 && normalized.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") ? normalized : null;
    }
    private String url(String path, String token) { return frontendUrl.replaceAll("/$", "") + path + token; }
    private String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
    private void send(String destination, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(sender); message.setTo(destination); message.setSubject(subject); message.setText(body);
        try { mail.send(message); }
        catch (MailException ex) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không gửi được email xác thực.", ex); }
    }
}
