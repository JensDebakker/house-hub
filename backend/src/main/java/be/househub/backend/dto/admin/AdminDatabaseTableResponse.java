package be.househub.backend.dto.admin;

import java.util.List;

public record AdminDatabaseTableResponse(
        String tableName,
        List<ColumnInfo> columns,
        List<String> primaryKeyColumns,
        List<ForeignKeyInfo> foreignKeys
) {
    public record ColumnInfo(String name, String type, boolean nullable) {
    }

    public record ForeignKeyInfo(String columnName, String referencedTable, String referencedColumn) {
    }
}
