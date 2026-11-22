package com.smartcampus.controller;

import com.smartcampus.auth.AccessService;
import com.smartcampus.auth.DbSessionIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {
    private final JdbcTemplate jdbc;
    private final AccessService access;

    public ResourceController(JdbcTemplate jdbc, AccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    public record Resource(Long id, Long roomId, String name, String type, int quantity, String status) { }
    public record Write(@NotBlank @Size(max = 20) String name,
                        @NotBlank @Size(max = 20) String type,
                        @Min(0) int quantity, @NotBlank String status) { }

    private void validateStatus(String status) {
        if (!List.of("AVAILABLE", "IN_USE", "BROKEN", "MAINTENANCE").contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid resource status");
    }

    private Resource one(Long id) {
        List<Resource> rows = jdbc.query("""
            SELECT resource_id,room_id,resource_name,resource_type,quantity,status
            FROM resources WHERE resource_id=?
            """, (rs, n) -> new Resource(rs.getLong(1), rs.getLong(2), rs.getString(3),
                rs.getString(4), rs.getInt(5), rs.getString(6)), id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
        return rows.getFirst();
    }

    private String viewerRole(Long userId) {
        if (access.hasPermission(userId, "ADMIN", "VIEW_RESOURCES")) return "ADMIN";
        if (access.hasPermission(userId, "TEACHER", "VIEW_RESOURCES")) return "TEACHER";
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Requires VIEW_RESOURCES permission");
    }

    @GetMapping
    public List<Resource> list(@RequestAttribute("authenticatedUserId") Long userId) {
        viewerRole(userId);
        return jdbc.query("""
            SELECT resource_id,room_id,resource_name,resource_type,quantity,status
            FROM resources ORDER BY room_id,resource_id
            """, (rs, n) -> new Resource(rs.getLong(1), rs.getLong(2), rs.getString(3),
                rs.getString(4), rs.getInt(5), rs.getString(6)));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public Resource get(@PathVariable Long id,
                        @RequestAttribute("authenticatedUserId") Long userId) {
        viewerRole(userId);
        return one(id);
    }

    @GetMapping("/rooms/{roomId}")
    @Transactional(readOnly = true)
    public List<Resource> forRoom(@PathVariable Long roomId,
                                  @RequestAttribute("authenticatedUserId") Long userId) {
        DbSessionIdentity.set(jdbc, userId, viewerRole(userId));
        return jdbc.query("""
            SELECT resource_id,room_id,resource_name,resource_type,quantity,status
            FROM list_room_resources(?) ORDER BY resource_id
            """, (rs,n) -> new Resource(rs.getLong(1),rs.getLong(2),rs.getString(3),
                    rs.getString(4),rs.getInt(5),rs.getString(6)),roomId);
    }

    @PostMapping("/rooms/{roomId}")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Resource create(@PathVariable Long roomId, @Valid @RequestBody Write body,
                           @RequestAttribute("authenticatedUserId") Long userId) {
        access.requireRole(userId, "ADMIN");
        validateStatus(body.status());
        Long id = jdbc.queryForObject("""
            INSERT INTO resources(room_id,resource_name,resource_type,quantity,status)
            VALUES(?,?,?,?,?) RETURNING resource_id
            """, Long.class, roomId, body.name().trim(), body.type().trim(), body.quantity(), body.status());
        return one(id);
    }

    @PatchMapping("/{id}")
    @Transactional
    public Resource update(@PathVariable Long id, @Valid @RequestBody Write body,
                           @RequestAttribute("authenticatedUserId") Long userId) {
        access.requireRole(userId, "ADMIN");
        validateStatus(body.status());
        if (jdbc.update("""
            UPDATE resources SET resource_name=?,resource_type=?,quantity=?,status=? WHERE resource_id=?
            """, body.name().trim(), body.type().trim(), body.quantity(), body.status(), id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found");
        return one(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id,
                       @RequestAttribute("authenticatedUserId") Long userId) {
        access.requireRole(userId, "ADMIN");
        DbSessionIdentity.set(jdbc, userId, "ADMIN");
        jdbc.queryForObject("SELECT 1 FROM delete_room_resource(?)", Integer.class, id);
    }
}
