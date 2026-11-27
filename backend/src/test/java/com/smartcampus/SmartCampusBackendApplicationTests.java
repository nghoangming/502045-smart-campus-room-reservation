package com.smartcampus;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:context_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=none",
    "app.jwt.secret=ci-context-test-secret-with-at-least-32-characters"
})
class SmartCampusBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
