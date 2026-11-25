package com.smartcampus.controller;

import com.smartcampus.auth.AccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/users")
public class UserProfileController {
    private final JdbcTemplate jdbc;
    private final AccessService access;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder();

    public UserProfileController(JdbcTemplate jdbc, AccessService access) { this.jdbc = jdbc; this.access = access; }

    public record Profile(Long id, String code, String name, String email, String faculty, List<String> roles,
            OffsetDateTime createdAt, boolean verified, LocalDate birthDate, String phone,
            String personalEmail, boolean personalEmailVerified, String className, Integer entryYear) { }
    public record PublicTeacher(Long id, String code, String name, String email, String faculty) { }
    public record UpdateProfile(@NotBlank @Size(max = 100) String name, LocalDate birthDate,
            @Size(max = 20) String phone,
            @Size(max = 60) String className, Integer entryYear) { }
    public record ChangePassword(@NotBlank String currentPassword, @NotBlank @Size(min = 8) String newPassword) { }
    public record AdminUser(Long id, String code, String name, String email, String faculty, String role, boolean verified) { }
    public record UpdateFaculty(@NotBlank @Size(max = 100) String faculty) { }

    @GetMapping
    public List<AdminUser> users(@RequestAttribute("authenticatedUserId") Long adminId,
                                 @RequestParam(required = false) String faculty) {
        access.requireRole(adminId, "ADMIN");
        String sql = """
            SELECT u.user_id, u.user_code, u.full_name, u.email, u.faculty, r.role_name, u.email_verified
            FROM users u JOIN user_roles ur ON ur.user_id = u.user_id
            JOIN roles r ON r.role_id = ur.role_id
            """ + (faculty == null || faculty.isBlank() ? "" : " WHERE u.faculty = ?") + " ORDER BY u.user_id";
        return jdbc.query(sql, (rs, n) -> new AdminUser(rs.getLong(1), rs.getString(2), rs.getString(3),
                rs.getString(4), rs.getString(5), rs.getString(6), rs.getBoolean(7)),
                faculty == null || faculty.isBlank() ? new Object[0] : new Object[] { faculty });
    }

    @PatchMapping("/{id}/faculty")
    public Profile setFaculty(@PathVariable Long id,
                              @RequestAttribute("authenticatedUserId") Long adminId,
                              @Valid @RequestBody UpdateFaculty request) {
        access.requireRole(adminId, "ADMIN");
        access.requireRole(id, "STUDENT");
        List<String> codes = jdbc.query("SELECT user_code FROM users WHERE user_id=?",
                (rs, row) -> rs.getString(1), id);
        if (codes.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        String userCode = codes.getFirst();
        List<String[]> faculties = jdbc.query("""
                SELECT faculty_code, faculty_name FROM faculties
                WHERE lower(btrim(faculty_name))=lower(?) OR faculty_code=upper(?)
                """, (rs, row) -> new String[] {rs.getString(1), rs.getString(2)},
                request.faculty().trim(), request.faculty().trim());
        if (faculties.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoa không có trong danh sách A–P.");
        String[] faculty = faculties.getFirst();
        if (userCode.matches("S[A-P][0-9]{7}") && !userCode.substring(1, 2).equals(faculty[0]))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã sinh viên đã gắn với khoa khác; cần cấp lại mã tài khoản.");
        jdbc.update("UPDATE users SET faculty = ?, faculty_code = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                faculty[1], faculty[0], id);
        return profile(id);
    }

    @GetMapping("/me")
    public Profile me(@RequestAttribute("authenticatedUserId") Long userId) { return profile(userId); }

    @GetMapping("/{id}")
    public Profile getUser(@PathVariable Long id,
                           @RequestAttribute("authenticatedUserId") Long adminId) {
        access.requireRole(adminId, "ADMIN");
        return profile(id);
    }

    @PatchMapping("/me")
    public Profile update(@RequestAttribute("authenticatedUserId") Long userId,
                          @Valid @RequestBody UpdateProfile request) {
        boolean student = access.hasRole(userId, "STUDENT");
        boolean admin = access.hasRole(userId, "ADMIN");
        if (request.entryYear() != null && (request.entryYear() < 1900 || request.entryYear() > 2100))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Năm vào trường không hợp lệ.");
        if (student && request.entryYear() != null) {
            String code = jdbc.queryForObject("SELECT user_code FROM users WHERE user_id=?", String.class, userId);
            if (code != null && code.matches("S[A-P][0-9]{7}")
                    && request.entryYear() % 100 != Integer.parseInt(code.substring(2, 4)))
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Năm vào trường phải khớp với năm trong mã sinh viên.");
        }
        if (request.phone() != null && !request.phone().isBlank() && !request.phone().trim().matches("[+0-9 .()-]{8,20}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại không hợp lệ.");
        jdbc.update("""
            UPDATE users SET full_name = ?, birth_date = ?, phone = ?,
                class_name = ?, entry_year = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
            """, request.name().trim(), request.birthDate(), blankToNull(request.phone()),
                student ? blankToNull(request.className()) : null,
                admin ? null : request.entryYear(), userId);
        return profile(userId);
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestAttribute("authenticatedUserId") Long userId,
                               @Valid @RequestBody ChangePassword request) {
        List<String> hashes = jdbc.query("SELECT password_hash FROM users WHERE user_id = ?", (rs, n) -> rs.getString(1), userId);
        if (hashes.isEmpty() || !passwords.matches(request.currentPassword(), hashes.getFirst()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng.");
        if (request.currentPassword().equals(request.newPassword()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu cũ.");
        jdbc.update("UPDATE users SET password_hash = ?, auth_version=auth_version+1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                passwords.encode(request.newPassword()), userId);
    }

    @GetMapping("/{id}/public")
    public PublicTeacher publicTeacher(@PathVariable Long id) {
        access.requireRole(id, "TEACHER");
        List<PublicTeacher> rows = jdbc.query("""
                SELECT user_id, user_code, full_name, email, faculty FROM users WHERE user_id=?
                """, (rs, row) -> new PublicTeacher(rs.getLong(1), rs.getString(2),
                rs.getString(3), rs.getString(4), rs.getString(5)), id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giảng viên.");
        return rows.getFirst();
    }

    private Profile profile(Long id) {
        List<Profile> rows = jdbc.query("""
                SELECT user_id, user_code, full_name, email, faculty, created_at, email_verified,
                       birth_date, phone, personal_email, personal_email_verified, class_name, entry_year
                FROM users WHERE user_id = ?
                """,
                (rs, n) -> new Profile(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), jdbc.query("SELECT r.role_name FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = ?", (r, i) -> r.getString(1), id),
                        rs.getObject(6, OffsetDateTime.class), rs.getBoolean(7), rs.getObject(8, LocalDate.class),
                        rs.getString(9), rs.getString(10), rs.getBoolean(11), rs.getString(12), rs.getObject(13, Integer.class)), id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản.");
        return rows.getFirst();
    }
}
