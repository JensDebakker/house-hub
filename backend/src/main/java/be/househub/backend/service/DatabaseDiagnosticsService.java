package be.househub.backend.service;

import be.househub.backend.dto.admin.AdminDatabaseHealthResponse;
import be.househub.backend.dto.admin.AdminDatabaseTableResponse;
import be.househub.backend.dto.admin.AdminDatabaseTableResponse.ColumnInfo;
import be.househub.backend.dto.admin.AdminDatabaseTableResponse.ForeignKeyInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

/**
 * Reads live schema/connectivity state directly via JDBC metadata, independent of
 * what the entities or Flyway migrations claim - the same drift between "what the
 * code thinks the schema is" and "what the database actually has" that broke both
 * file uploads (nginx/permissions, unrelated) and registration (a stale NOT NULL
 * column neither Flyway nor Hibernate ever flagged) is exactly what this surfaces.
 */
@Service
@RequiredArgsConstructor
public class DatabaseDiagnosticsService {

    private final DataSource dataSource;

    public AdminDatabaseHealthResponse checkHealth() {
        long start = System.currentTimeMillis();
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            return new AdminDatabaseHealthResponse("UP", System.currentTimeMillis() - start, null);
        } catch (SQLException ex) {
            return new AdminDatabaseHealthResponse("DOWN", System.currentTimeMillis() - start, ex.getMessage());
        }
    }

    public List<AdminDatabaseTableResponse> describeSchema() {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String catalog = connection.getCatalog();
            String schema = connection.getSchema();

            List<AdminDatabaseTableResponse> tables = new ArrayList<>();
            try (ResultSet tableRows = metaData.getTables(catalog, schema, "%", new String[]{"TABLE"})) {
                while (tableRows.next()) {
                    String tableName = tableRows.getString("TABLE_NAME");
                    tables.add(new AdminDatabaseTableResponse(
                            tableName,
                            describeColumns(metaData, catalog, schema, tableName),
                            describePrimaryKey(metaData, catalog, schema, tableName),
                            describeForeignKeys(metaData, catalog, schema, tableName)));
                }
            }
            return tables;
        } catch (SQLException ex) {
            throw new IllegalStateException("Failed to read database schema metadata", ex);
        }
    }

    private List<ColumnInfo> describeColumns(DatabaseMetaData metaData, String catalog, String schema, String table)
            throws SQLException {
        List<ColumnInfo> columns = new ArrayList<>();
        try (ResultSet columnRows = metaData.getColumns(catalog, schema, table, "%")) {
            while (columnRows.next()) {
                columns.add(new ColumnInfo(
                        columnRows.getString("COLUMN_NAME"),
                        columnRows.getString("TYPE_NAME"),
                        columnRows.getInt("NULLABLE") == DatabaseMetaData.columnNullable));
            }
        }
        return columns;
    }

    private List<String> describePrimaryKey(DatabaseMetaData metaData, String catalog, String schema, String table)
            throws SQLException {
        List<String> primaryKeyColumns = new ArrayList<>();
        try (ResultSet pkRows = metaData.getPrimaryKeys(catalog, schema, table)) {
            while (pkRows.next()) {
                primaryKeyColumns.add(pkRows.getString("COLUMN_NAME"));
            }
        }
        return primaryKeyColumns;
    }

    private List<ForeignKeyInfo> describeForeignKeys(DatabaseMetaData metaData, String catalog, String schema, String table)
            throws SQLException {
        List<ForeignKeyInfo> foreignKeys = new ArrayList<>();
        try (ResultSet fkRows = metaData.getImportedKeys(catalog, schema, table)) {
            while (fkRows.next()) {
                foreignKeys.add(new ForeignKeyInfo(
                        fkRows.getString("FKCOLUMN_NAME"),
                        fkRows.getString("PKTABLE_NAME"),
                        fkRows.getString("PKCOLUMN_NAME")));
            }
        }
        return foreignKeys;
    }
}
