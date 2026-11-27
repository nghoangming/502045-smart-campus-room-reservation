package com.smartcampus.controller;

import com.smartcampus.auth.AccessService;
import com.smartcampus.auth.DbSessionIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {
    private final JdbcTemplate jdbc;
    private final AccessService access;

    public IncidentController(JdbcTemplate jdbc, AccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    public record Incident(Long id, Long roomId, String roomCode, String facultyCode, Long resourceId,
                           Long reportedBy, String reporterName, String category, String description,
                           String status, Long assignedTo, String assignedTeam,
                           OffsetDateTime createdAt, OffsetDateTime resolvedAt) { }
    public record Report(@NotNull Long roomId, Long resourceId,
                         @NotBlank @Size(max = 30) String category,
                         @NotBlank @Size(min = 10, max = 500) String description) { }
    public record Decision(@NotBlank String status, Long assignedTo, String assignedTeam) { }

    private static final String SELECT = """
        SELECT i.incident_id,i.room_id,r.room_code,u.faculty_code,i.resource_id,i.reported_by,u.full_name,
               i.incident_type,i.description,i.status,i.assigned_to,i.assigned_team,
               COALESCE(i.occurred_at,i.updated_at),i.resolved_at
        FROM incidents i LEFT JOIN rooms r ON r.room_id=i.room_id
        JOIN users u ON u.user_id=i.reported_by
        """;
    private final org.springframework.jdbc.core.RowMapper<Incident> mapper = (rs, n) -> new Incident(
        rs.getLong(1), rs.getObject(2, Long.class), rs.getString(3), rs.getString(4),
        rs.getObject(5, Long.class), rs.getLong(6), rs.getString(7), rs.getString(8), rs.getString(9),
        rs.getString(10), rs.getObject(11, Long.class), rs.getString(12),
        rs.getObject(13, OffsetDateTime.class), rs.getObject(14, OffsetDateTime.class));

    private Incident one(Long id) {
        List<Incident> rows = jdbc.query(SELECT + " WHERE i.incident_id=?", mapper, id);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found");
        return rows.getFirst();
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Incident> list(@RequestAttribute("authenticatedUserId") Long userId) {
        if (access.hasRole(userId, "ADMIN")) {
            DbSessionIdentity.set(jdbc, userId, "ADMIN");
            return jdbc.query(SELECT + " ORDER BY i.incident_id DESC", mapper);
        }
        access.requireRole(userId, "TEACHER");
        DbSessionIdentity.set(jdbc, userId, "TEACHER");
        return jdbc.query(SELECT + " WHERE i.reported_by=? ORDER BY i.incident_id DESC", mapper, userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Incident report(@Valid @RequestBody Report body,
                           @RequestAttribute("authenticatedUserId") Long userId) {
        access.requireRole(userId, "TEACHER");
        DbSessionIdentity.set(jdbc, userId, "TEACHER");
        if (!List.of("PROJECTOR", "AC", "LIGHTING", "SOUND", "OTHER").contains(body.category()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid incident category");
        if (body.resourceId() != null) {
            Integer count = jdbc.queryForObject("SELECT count(*) FROM resources WHERE resource_id=? AND room_id=?",
                Integer.class, body.resourceId(), body.roomId());
            if (count == null || count == 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resource does not belong to room");
        }
        Long id = jdbc.queryForObject("""
            INSERT INTO incidents(room_id,resource_id,reported_by,incident_type,description,occurred_at,status)
            VALUES(?,?,?,?,?,CURRENT_TIMESTAMP,'OPEN') RETURNING incident_id
            """, Long.class, body.roomId(), body.resourceId(), userId, body.category(), body.description().trim());
        return one(id);
    }

    @PatchMapping("/{id}")
    @Transactional
    public Incident decide(@PathVariable Long id, @Valid @RequestBody Decision body,
                           @RequestAttribute("authenticatedUserId") Long userId) {
        access.requireRole(userId, "ADMIN");
        DbSessionIdentity.set(jdbc, userId, "ADMIN");
        if (!List.of("OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED").contains(body.status()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid incident status");
        List<String[]> current = jdbc.query("SELECT status,assigned_to,assigned_team FROM incidents WHERE incident_id=? FOR UPDATE",
                (rs, row) -> new String[] {rs.getString(1),rs.getString(2),rs.getString(3)}, id);
        if (current.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found");
        String previous = current.getFirst()[0];
        boolean assignmentProvided = body.assignedTo() != null || body.assignedTeam() != null;
        Long assignedTo = assignmentProvided ? body.assignedTo()
                : current.getFirst()[1] == null ? null : Long.valueOf(current.getFirst()[1]);
        String assignedTeam = assignmentProvided
                ? body.assignedTeam() == null || body.assignedTeam().isBlank() ? null : body.assignedTeam()
                : current.getFirst()[2];
        if (!previous.equals(body.status()) &&
                !("OPEN".equals(previous) && List.of("IN_PROGRESS", "RESOLVED", "REJECTED").contains(body.status())) &&
                !("IN_PROGRESS".equals(previous) && List.of("RESOLVED", "REJECTED").contains(body.status())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invalid incident status transition");
        if (assignedTo != null && assignedTeam != null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose either a person or a team");
        if (assignedTo != null) {
            Integer count = jdbc.queryForObject("SELECT count(*) FROM users WHERE user_id=?", Integer.class, assignedTo);
            if (count == null || count == 0)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user not found");
        }
        if (assignedTeam != null && !List.of("HARDWARE", "SOFTWARE").contains(assignedTeam))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid incident team");
        if (assignedTeam != null) {
            String faculty = jdbc.queryForObject("""
                SELECT u.faculty_code FROM incidents i JOIN users u ON u.user_id=i.reported_by
                WHERE i.incident_id=?
                """, String.class, id);
            if (faculty == null || faculty.isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reporter faculty is required for assignment");
        }
        if (jdbc.update("""
            UPDATE incidents SET status=?, assigned_to=?, assigned_team=?, updated_at=CURRENT_TIMESTAMP,
                resolved_at=CASE WHEN ?='RESOLVED' THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE incident_id=?
            """, body.status(), assignedTo, assignedTeam, body.status(), id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found");
        return one(id);
    }
}
