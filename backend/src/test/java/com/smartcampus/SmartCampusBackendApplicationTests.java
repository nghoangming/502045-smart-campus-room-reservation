package com.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration-test")
class SmartCampusBackendApplicationTests {

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Flyway flyway;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void migrationsValidateAndSecondRunDoesNotChangeTheDatabase() {
        flyway.validate();
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM roles", Integer.class)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM user_roles", Integer.class)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM rooms", Integer.class)).isEqualTo(6);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM bookings", Integer.class)).isEqualTo(4);
        assertThat(jdbcTemplate.queryForList("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'", String.class))
                .contains("idx_rooms_status_location", "idx_bookings_room_active_time");
    }

    @Test
    void loginReadsSeededAccountsAndJwtProtectsCurrentUser() throws Exception {
        HttpResponse<String> loginResponse = post("/auth/login", """
                {"email":"admin@smartcampus.test","password":"Admin@123"}
                """);
        assertThat(loginResponse.statusCode()).isEqualTo(200);
        assertThat(loginResponse.body()).doesNotContain("password");
        JsonNode login = objectMapper.readTree(loginResponse.body());
        assertThat(login.path("user").path("role").asString()).isEqualTo("ADMIN");
        String token = login.path("token").asString();
        assertThat(token.split("\\.")).hasSize(3);
        HttpResponse<String> currentUser = httpClient.send(HttpRequest.newBuilder(uri("/auth/me"))
                .header("Authorization", "Bearer " + token).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(currentUser.statusCode()).isEqualTo(200);
        assertThat(currentUser.body()).contains("admin@smartcampus.test").doesNotContain("password");
        assertThat(get("/auth/me").statusCode()).isEqualTo(401);
        assertThat(post("/auth/login", "{\"username\":\"student\",\"password\":\"Student@123\"}").body())
                .contains("STUDENT");
    }

    @Test
    void invalidCredentialsAndInvalidRequestsAreRejected() throws Exception {
        HttpResponse<String> wrongPassword = post("/auth/login", "{\"username\":\"admin\",\"password\":\"wrong\"}");
        HttpResponse<String> unknownUser = post("/auth/login", "{\"username\":\"unknown\",\"password\":\"wrong\"}");
        assertThat(wrongPassword.statusCode()).isEqualTo(401);
        assertThat(unknownUser.statusCode()).isEqualTo(401);
        assertThat(unknownUser.body()).isEqualTo(wrongPassword.body());
        assertThat(post("/auth/login", "{}").statusCode()).isEqualTo(400);
        assertThat(get("/rooms/availability?date=2026-10-16&startTime=10:00&endTime=08:00").statusCode()).isEqualTo(400);
        assertThat(get("/rooms/999999").statusCode()).isEqualTo(404);
    }

    @Test
    void availabilityExcludesOverlapsAndMaintenanceButAllowsAdjacentAndCancelledSlots() throws Exception {
        HttpResponse<String> available = get("/rooms/availability?date=2026-10-16&startTime=08:00&endTime=10:00");
        assertThat(available.statusCode()).isEqualTo(200);
        assertThat(available.body()).contains("B201", "C301", "C302").doesNotContain("A101", "A102", "B202");
        HttpResponse<String> adjacent = get("/rooms/availability?date=2026-10-16&startTime=10:00&endTime=11:00");
        assertThat(adjacent.body()).contains("A101").doesNotContain("A102", "B202");
        Long roomId = jdbcTemplate.queryForObject("SELECT room_id FROM rooms WHERE room_code = 'A101'", Long.class);
        JsonNode schedule = objectMapper.readTree(get("/rooms/" + roomId + "/schedule?date=2026-10-16").body());
        assertThat(schedule.size()).isEqualTo(1);
        assertThat(schedule.get(0).path("status").asString()).isEqualTo("APPROVED");
        assertThat(get("/rooms/" + roomId + "/schedule?date=2099-01-01").body()).isEqualTo("[]");
        Long cancelledRoomId = jdbcTemplate.queryForObject("SELECT room_id FROM rooms WHERE room_code = 'C301'", Long.class);
        assertThat(get("/rooms/" + cancelledRoomId + "/schedule?date=2026-10-16").body()).isEqualTo("[]");
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + "/api/v1" + path);
    }

    private HttpResponse<String> get(String path) throws Exception {
        return httpClient.send(HttpRequest.newBuilder(uri(path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        return httpClient.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
}
