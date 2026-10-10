package be.househub.backend.service;

import be.househub.backend.dto.admin.AdminDatabaseTableResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DatabaseDiagnosticsServiceTest {

    @Autowired
    private DatabaseDiagnosticsService databaseDiagnosticsService;

    @Test
    void checkHealth_realDatasource_reportsUp() {
        var health = databaseDiagnosticsService.checkHealth();

        assertThat(health.status()).isEqualTo("UP");
        assertThat(health.error()).isNull();
    }

    @Test
    void describeSchema_realDatasource_reportsUsersTableShape() {
        List<AdminDatabaseTableResponse> tables = databaseDiagnosticsService.describeSchema();

        Optional<AdminDatabaseTableResponse> usersTable = tables.stream()
                .filter(t -> t.tableName().equalsIgnoreCase("users"))
                .findFirst();
        assertThat(usersTable).isPresent();

        List<String> columnNames = usersTable.get().columns().stream()
                .map(AdminDatabaseTableResponse.ColumnInfo::name)
                .map(String::toLowerCase)
                .toList();
        assertThat(columnNames).contains("id", "email", "display_name", "role");
        // Guards against exactly today's incident regressing: these two columns were
        // dropped as legacy drift (household_role was NOT NULL, broke every registration).
        assertThat(columnNames).doesNotContain("household_role", "household_id");
    }
}
